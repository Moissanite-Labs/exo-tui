"""Exercise the real terminal transport on POSIX; called by the Bun test suite."""
import fcntl
import os
import pty
import select
import struct
import subprocess
import termios
import time

master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 90, 0, 0))
before = termios.tcgetattr(slave)
env = os.environ.copy()
env['TERM'] = 'xterm-256color'
process = subprocess.Popen(['bun', 'src/index.ts', '--mock'], stdin=slave, stdout=slave, stderr=subprocess.PIPE, env=env)
output = b''

def drain_until(predicate, seconds=5):
    global output
    deadline = time.monotonic() + seconds
    while not predicate() and time.monotonic() < deadline:
        if select.select([master], [], [], 0.1)[0]:
            try:
                output += os.read(master, 65536)
            except OSError:
                break

try:
    drain_until(lambda: b'FOCUS:' in output)
    assert b'FOCUS:' in output, 'UI did not start'
    os.write(master, b'hello\r')
    drain_until(lambda: b'Mock reply' in output)
    assert b'Mock reply' in output, 'mock reply did not render'
    os.write(master, b'\x11')  # Ctrl+Q
    drain_until(lambda: process.poll() is not None)
    code = process.wait(timeout=1)
    stderr = process.stderr.read()
    assert code == 0, f'process exited {code}; stderr: {stderr!r}'
    drain_until(lambda: b'\x1b[?1049l' in output, seconds=1)
    assert b'\x1b[?1049l' in output, 'alternate screen was not restored'
    assert termios.tcgetattr(slave) == before, 'terminal modes were not restored'
    assert stderr == b'', 'unexpected stderr while renderer owned terminal'
finally:
    if process.poll() is None:
        process.kill()
        process.wait()
    os.close(master)
    os.close(slave)
