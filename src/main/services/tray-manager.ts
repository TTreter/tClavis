import { app, Tray, Menu, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export class TrayManager {
  private tray: Tray | null = null;

  constructor(
    private getMainWindow: () => BrowserWindow | null,
    private onTriggerSync: () => Promise<void>
  ) {}

  public initialize(): void {
    // 1. Resolução determinística de caminhos em dev e prod
    const candidatePaths = [
      path.join(__dirname, 'assets/tray-icon.png'),
      path.join(__dirname, '../assets/tray-icon.png'),
      path.resolve(__dirname, '../../build/tray-icon.png'),
      path.resolve(__dirname, '../../build/icon.png'),
    ];

    let image = nativeImage.createEmpty();
    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate)) {
        const loaded = nativeImage.createFromPath(candidate);
        if (!loaded.isEmpty()) {
          image = loaded;
          break;
        }
      }
    }

    // 2. Fallback visual de alto contraste: Chave tClavis em ciano luminoso (#00e5ff)
    if (image.isEmpty()) {
      image = nativeImage.createFromBuffer(
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAA9JJREFUWIXtlH9MlVUcxp/zvu9FLrdrCxFLaa5AECWxGDRnbumYWyNszLA2ljkzxlYzbZPW1urdqlmznK2N9XuuWSrVH2z0A7I1Cs1ZUNFFEMK4XEToXryXy8X7433f8/RHV2KAAw1obXz+/J6d8zzne57vAeaZZ57pQor/UDsuPpcmroiudYceLeyL1pUHuRIAoFOZdXE9LvJkb3hT0U/+EefRBuaf6v5t9zBzxq7PCldu/ro/dudOP7vK2iIsPXMx4nivlusbe1xzYkKPcs1DF63flX4y5Zxl7nKNcOu5oHHju59z47fu2TVxmEzf2Trky+wknT2MOtotmdVsWBWtYZZ4LhupVbXcfKJ7xkxM2GwAoRQVb+1NNj6414HYiCoQEJrS5AWyopq6rqQwdtbVsrrrZPeximHm6LqQ1aRKUpBUqOsKSeVfGTsYYUZJV6QFbjLbQ/OJbvNCdmNM7vkxKo9EyOIBkysO1PCR+j9cT4W45mrncBpjq43fIIRgasS83TJlRn4ircKF4k1nVM22JapLhZ1YJeXugKrenf/4ljLXOzWr77fFPn5pmC8kmKZvSYK2ccjArckafEkL8IUQooGAEACvuQv1Ea5oijHvxQCrcy6RRWclj3qtCgBIO+Wxb/HzswfPR1lU/Qtf6ycrBwxjbYDM6CMLeshn+mh+FWIlABC4aiembJHuN3eENbU4M2rVPJaifVhNqtuEsNZ5aL9Z8OuERLEeg2HzuEkNKUlwSED1wbCFDHXHLTZlUwoqi24QB669E3+HSoyvAQB1XQGAV33GK+XuGLXvvTExQCpVn0rn1u3yjqZBprdQLv8mYu3vtOR3ZAGmmYlJfFCAFGNTTUCATDjkCX/pPOGTaIka4tBHEvZkYnGaXJ53jyxu9sr0BiNW3ko2hvhs/KwJkzHlqAghCCGo60KO1gDqCKd2+EZyhw1LJFz2K9xTJrD3OWh/eoT75xYkVb3MtGTNZkpIAE4AwCcTn1wbX5gudlAKRViQFrWFyViybRc8xw7THLyAZTc5kPlAqWgO0shfLGxJiWgHAJRexzRMRvwJ1Dd6RuocjUHizFDsNh+5YXuFLEhNlc/XNjK3lcz7gTziMdraGFw0I8KjBuJhqjW4YV93NCCahonzZjTTSz7cK81lLsqMZvL9fna2M5g1o+KjJuIjfNrg5n1eGVh0iYSHRCeZ6ybf9rKjl5FMTJH+686AAEhdV4RN1J80eN9Kiac7yFVJC2DkOcXpuxIj+5cKu5ukIsQ/AZ5xxt6Ov9Y5WH3QPtnarMJxnxZJZc7E5/nf8xeCPUs11DVr4gAAAABJRU5ErkJggg==',
          'base64'
        )
      );
    }

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
