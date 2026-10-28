import { app, BrowserWindow, ipcMain } from 'electron';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { URL } from 'url';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
}

export interface DownloadProgress {
  percentage: number;
  transferredBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
}

export class GitHubUpdater {
  private repoOwner = 'TTreter';
  private repoName = 'tClavis';
  private downloadedFilePath: string | null = null;
  private isDownloading = false;

  public async checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = app.getVersion();
    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`;

    try {
      const data = await this.fetchJson(apiUrl);
      if (!data || !data.tag_name) {
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          releaseName: '',
          releaseNotes: '',
          publishedAt: '',
        };
      }

      const latestVersion = data.tag_name.replace(/^v/, '');
      const hasUpdate = this.compareSemver(latestVersion, currentVersion) > 0;

      // Find Windows installer asset (.exe)
      let downloadUrl: string | undefined;
      let assetName: string | undefined;
      let assetSize: number | undefined;

      if (data.assets && Array.isArray(data.assets)) {
        const exeAsset = data.assets.find(
          (a: any) => a.name && a.name.toLowerCase().endsWith('.exe')
        );
        if (exeAsset) {
          downloadUrl = exeAsset.browser_download_url;
          assetName = exeAsset.name;
          assetSize = exeAsset.size;
        }
      }

      return {
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseName: data.name || data.tag_name,
        releaseNotes: data.body || 'Sem notas de versão fornecidas.',
        publishedAt: data.published_at || '',
        downloadUrl,
        assetName,
        assetSize,
      };
    } catch (err: any) {
      console.error('[GitHubUpdater] Erro ao verificar atualizações:', err.message);
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseName: '',
        releaseNotes: `Erro ao buscar atualizações: ${err.message}`,
        publishedAt: '',
      };
    }
  }

  public async downloadUpdate(
    downloadUrl: string,
    assetName: string,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    if (this.isDownloading) {
      return { success: false, error: 'Um download já está em andamento.' };
    }

    this.isDownloading = true;
    const tempDir = app.getPath('temp');
    const safeName = assetName || `tClavis-update-${Date.now()}.exe`;
    const destPath = path.join(tempDir, safeName);
    this.downloadedFilePath = destPath;

    try {
      await this.downloadFileWithRedirects(downloadUrl, destPath, onProgress);
      this.isDownloading = false;
      return { success: true, filePath: destPath };
    } catch (err: any) {
      this.isDownloading = false;
      console.error('[GitHubUpdater] Falha no download da atualização:', err);
      return { success: false, error: err.message };
    }
  }

  public installUpdate(): boolean {
    if (!this.downloadedFilePath || !fs.existsSync(this.downloadedFilePath)) {
      console.error('[GitHubUpdater] Arquivo de instalação não encontrado.');
      return false;
    }

    try {
      console.log(`[GitHubUpdater] Iniciando instalador: ${this.downloadedFilePath}`);
      // Run the installer detached and quit the current application
      const child = spawn(this.downloadedFilePath, [], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      (app as any).isQuitting = true;
      app.quit();
      return true;
    } catch (err: any) {
      console.error('[GitHubUpdater] Erro ao iniciar instalador:', err);
      return false;
    }
  }

  private compareSemver(v1: string, v2: string): number {
    const parse = (v: string) => v.replace(/^v/, '').split('.').map((p) => parseInt(p, 10) || 0);
    const p1 = parse(v1);
    const p2 = parse(v2);
    const maxLen = Math.max(p1.length, p2.length);

    for (let i = 0; i < maxLen; i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  private fetchJson(urlString: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlString);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          'User-Agent': 'tClavis-Desktop-App',
          Accept: 'application/vnd.github.v3+json',
        },
      };

      https
        .get(options, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return this.fetchJson(res.headers.location).then(resolve).catch(reject);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`GitHub API respondeu com status ${res.statusCode}`));
          }

          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (err) {
              reject(err);
            }
          });
        })
        .on('error', reject);
    });
  }

  private downloadFileWithRedirects(
    urlString: string,
    destPath: string,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const requestWithRedirect = (currentUrl: string, maxRedirects = 5) => {
        if (maxRedirects <= 0) {
          return reject(new Error('Muitos redirecionamentos'));
        }

        const url = new URL(currentUrl);
        const protocol = url.protocol === 'https:' ? https : http;

        const req = protocol.get(
          currentUrl,
          {
            headers: {
              'User-Agent': 'tClavis-Desktop-App',
              Accept: 'application/octet-stream',
            },
          },
          (res) => {
            if (
              res.statusCode &&
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              return requestWithRedirect(res.headers.location, maxRedirects - 1);
            }

            if (res.statusCode !== 200) {
              return reject(new Error(`Falha no download. Código HTTP: ${res.statusCode}`));
            }

            const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
            let transferredBytes = 0;
            let lastTime = Date.now();
            let lastBytes = 0;
            let speedBytesPerSec = 0;

            const fileStream = fs.createWriteStream(destPath);

            res.on('data', (chunk) => {
              transferredBytes += chunk.length;
              const now = Date.now();
              const elapsedSec = (now - lastTime) / 1000;

              if (elapsedSec >= 0.5) {
                speedBytesPerSec = (transferredBytes - lastBytes) / elapsedSec;
                lastTime = now;
                lastBytes = transferredBytes;

                const percentage = totalBytes > 0 ? Math.round((transferredBytes / totalBytes) * 100) : 0;
                onProgress({
                  percentage,
                  transferredBytes,
                  totalBytes,
                  speedBytesPerSec,
                });
              }
            });

            res.pipe(fileStream);

            fileStream.on('finish', () => {
              fileStream.close();
              onProgress({
                percentage: 100,
                transferredBytes,
                totalBytes: totalBytes || transferredBytes,
                speedBytesPerSec: 0,
              });
              resolve();
            });

            fileStream.on('error', (err) => {
              fs.unlink(destPath, () => {});
              reject(err);
            });
          }
        );

        req.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      };

      requestWithRedirect(urlString);
    });
  }
}
