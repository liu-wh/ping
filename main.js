const { app, BrowserWindow, Menu, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const spawn = require('child_process').spawn;
const  iconvLite = require('iconv-lite');

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, './build/index.html')}`);
  mainWindow.on('closed', () => mainWindow = null);
};
Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow();
});

ipcMain.on('Ping', async (event, opions, hosts, closed) => {
  var count = 0
  var errCount = 0
  var errHosts = []
  for (let i=0;i<hosts.length;i++) {
      event.reply("ping-result", `start^${hosts[i]}`)
      var child = spawn("ping", opions ? [...opions, `${hosts[i]}`] : [`${hosts[i]}`])
      event.reply("ping-result", `pid^${child.pid}`)
      count = count + 1
      child.stdout.on('data', function(data) {
          const mess = iconvLite.decode(data, 'cp936').toString()
          event.reply("ping-result", `mess^${hosts[i]}^${mess}`)
      })
      child.on("close", function(code){
          if (code !== 0){
              errCount = errCount +1
              errHosts.push(hosts[i])
          }
          count = count - 1
          if (count == 0){
              setTimeout(() => {event.reply("ping-result", "done", errHosts)}, 500)
          }
      })


  }
})






app.whenReady().then(
  () => {
      globalShortcut.register('CommandOrControl+Shift+I', () => { mainWindow.webContents.openDevTools({ mode: 'bottom' }); })
  }
)