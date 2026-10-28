import { app, Tray, Menu, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';

export class TrayManager {
  private tray: Tray | null = null;

  constructor(
    private getMainWindow: () => BrowserWindow | null,
    private onTriggerSync: () => Promise<void>
  ) {}

  public initialize(): void {
    const iconPath = path.resolve(__dirname, '../../tclavis-icon.svg');
    let image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) {
      image = nativeImage.createFromBuffer(
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZSURBVDhPY/wPBAxUAIwGBgYGBsZQMHABAHoI/wHjH4s2AAAAAElFTkSuQmCC',
          'base64'
        )
      );
    }
    image = image.resize({ width: 16, height: 16 });

    this.tray = new Tray(image);
    this.tray.setToolTip('tClavis — MikroTik Hotspot Sync');

    this.updateMenu('Operacional (Cluster Conectado)');

    this.tray.on('click', () => {
      this.toggleWindow();
    });
  }

  public updateMenu(statusText: string): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `tClavis: ${statusText}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Abrir Painel',
        click: () => this.showWindow(),
      },
      {
        label: 'Sincronizar Cluster Agora',
        click: () => {
          this.onTriggerSync().catch((err) => console.error('Tray sync error:', err));
        },
      },
      { type: 'separator' },
      {
        label: 'Encerrar tClavis',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  private toggleWindow(): void {
    const win = this.getMainWindow();
    if (!win) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  }

  private showWindow(): void {
    const win = this.getMainWindow();
    if (win) {
      win.show();
      win.focus();
    }
  }

  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
