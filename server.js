const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();
const expressWs = require('express-ws');
const pty = require('node-pty');
const path = require('path');
const fs = require('fs');

app.use(cors())
expressWs(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Daftar command yang diizinkan (whitelist)
const allowedCommands = ['nmap', 'npm', 'ssh', 'php', 'python', 'bash', 'sudo', 'screenfetch', 'crontab', 'uname', 'w', 'find', 'history', 'du', 'lsof', 'netstat', 'node', 'touch', 'hostname', 'df', 'ps', 'free', 'hollywood', 'mkdir', 'ls', 'l', 'ping', 'echo', 'date', 'uptime', 'curl', 'whoami', 'cat', 'ssh', 'clear', 'nano'];

app.ws('/terminal', (ws) => {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 100,
    rows: 100,
    cwd: process.env.HOME,
    env: process.env
  });

  ptyProcess.on('data', data => ws.send(data));
  ws.on('message', msg => ptyProcess.write(msg));
  ws.on('close', () => ptyProcess.kill());
});

app.post('/create-file', (req, res) => {
  const { filename, content } = req.body;

  // Validasi dasar
  if (!filename || typeof filename !== 'string') {
    return res.status(400).send('Nama file tidak valid.');
  }

  // Hindari directory traversal
  const safePath = path.join(__dirname, 'output', path.basename(filename));

  try {
    fs.writeFileSync(safePath, content);
    res.send(`✅ File berhasil dibuat di: ${safePath}`);
  } catch (err) {
    res.status(500).send('❌ Gagal membuat file.');
  }
});


app.post('/execute', (req, res) => {
  let command = req.body.command;

  if (!command || typeof command !== 'string') {
    return res.status(400).send('Invalid command');
  }

  // Ambil kata pertama (command utama)
  const baseCmd = command.split(' ')[0].toLowerCase();

  if (!allowedCommands.includes(baseCmd)) {
    return res.status(403).send(`Command "${baseCmd}" not allowed.`);
  }

  exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(`Error: ${error.message}`);
    }
    if (stderr) {
      // Kadang command normal output ke stderr, jadi tetap kirim
      return res.send(`Stderr:\n${stderr}`);
    }
    res.send(`Output:\n${stdout}`);
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
