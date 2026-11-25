// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as path from 'path';
import * as ejs from 'ejs';
import * as fs from 'fs';
import { ThemedView } from '../dialog/themedview';
import { EventTypeRenderer } from '../eventtypes';
import type { StartupProgress } from './startup';

export class ProgressView {
  constructor(options: ProgressView.IOptions) {
    this._view = new ThemedView({
      isDarkTheme: options.isDarkTheme,
      preload: path.join(__dirname, './preload.js')
    });

    const progressLogo = fs.readFileSync(
      path.join(__dirname, '../../../app-assets/progress-logo.svg')
    );

    const template = `
      <style>
        .container {
          display: flex;
          height: 100%;
          flex-direction: column;
          font-size: 16px;
        }
        .row {
          display: flex;
          flex-direction: row;
          line-height: 18px;
        }
        .progress-logo-row {
          flex-direction: column;
          align-items: center;
          flex-grow: 1;
          padding-top: 100px;
        }
        .progress-logo {
          height: 100%;
          display: flex;
          flex-direction: row;
          align-items: center;
        }
        .progress-logo svg {
          width: 200px;
          height: 200px;
        }
        .progress-message-row {
          width: 100%;
          height: 50%;
          flex-direction: column;
          align-items: center;
        }
        #progress-title, #progress-detail, #child-process-log {
          width: 80%;
          text-align: center;
        }
        #progress-title {
          margin-bottom: 15px;
          font-weight: bold;
        }
        #progress-detail {
          font-size: 14px;
        }
        #child-process-log {
          border-top: 1px solid #e7e7e7;
          padding-top: 20px;
          font-size: 12px;
          overflow-y: scroll;
          max-height: 150px;
        }
        .message-row {
          padding-bottom: 10px;
        }
        .startup-shell:not([hidden]) {
          min-height: 100%;
          display: grid;
          place-items: center;
          padding: 28px 22px;
          box-sizing: border-box;
        }
        .startup-panel {
          --startup-accent: #1869b9;
          --startup-muted: #526071;
          --startup-track: #dce3e9;
          width: min(100%, 560px);
          color: inherit;
          font: 14px/1.45 system-ui, sans-serif;
        }
        .app-ui-dark .startup-panel {
          --startup-accent: #79bcff;
          --startup-muted: #b3c0cc;
          --startup-track: #414750;
        }
        .startup-brand, .startup-transfer, .startup-artifact {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }
        .startup-brand {
          align-items: center;
          font-weight: 600;
          margin-bottom: 24px;
        }
        .startup-brand img {
          width: 32px;
          height: 32px;
          vertical-align: middle;
          margin-inline-end: 9px;
        }
        #startup-elapsed, #startup-detail, .startup-transfer, .startup-artifact {
          color: var(--startup-muted);
        }
        #startup-heading {
          margin: 0;
          font-size: clamp(23px, 5vw, 32px);
          line-height: 1.2;
        }
        #startup-detail {
          margin: 8px 0 22px;
        }
        #startup-meter {
          border: 0;
          display: block;
          width: 100%;
          height: 7px;
          border-radius: 5px;
          overflow: hidden;
          accent-color: var(--startup-accent);
          color: var(--startup-accent);
          background: var(--startup-track);
        }
        #startup-meter::-webkit-progress-bar {
          background: var(--startup-track);
        }
        #startup-meter::-webkit-progress-value {
          background: var(--startup-accent);
        }
        #startup-meter:indeterminate::-webkit-progress-bar {
          background: linear-gradient(var(--startup-accent), var(--startup-accent))
            -40% 0 / 28% 100% no-repeat var(--startup-track);
          animation: startup-sweep 1.4s linear infinite;
        }
        @keyframes startup-sweep {
          to { background-position: 140% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          #startup-meter:indeterminate::-webkit-progress-bar {
            animation: none;
            background-position: center;
          }
        }
        .startup-transfer {
          margin-top: 7px;
          font-variant-numeric: tabular-nums;
        }
        #startup-artifacts {
          margin: 16px 0 0;
          padding: 0;
          list-style: none;
        }
        .startup-artifact {
          padding-block: 4px;
        }
        .startup-steps {
          display: grid;
          gap: 12px;
          grid-auto-flow: column;
          grid-auto-columns: 1fr;
          margin: 24px 0 0;
          padding: 0;
          list-style: none;
        }
        .startup-steps li {
          padding-top: 8px;
          border-top: 2px solid var(--startup-track);
          color: var(--startup-muted);
          font-size: 13px;
        }
        .startup-steps li[data-state="complete"], .startup-steps li[aria-current="step"] {
          border-top-color: var(--startup-accent);
        }
        .startup-steps li[aria-current="step"] {
          color: inherit;
          font-weight: 600;
        }
      </style>
  
      <div class="container" id="legacy-progress" title="">
        <div class="row progress-logo-row">
          <div id="progress-logo" class="progress-logo animated">${progressLogo}</div>
        </div>
        <div class="row progress-message-row">
          <div id="progress-title"></div>
          <div id="progress-detail"></div>
          <div id="child-process-log"></div>
        </div>
      </div>
      <main id="startup-progress" class="startup-shell" hidden>
        <section class="startup-panel" aria-labelledby="startup-heading">
          <div class="startup-brand">
            <span><img src="data:image/svg+xml;base64,${progressLogo.toString(
              'base64'
            )}" alt="">Neurodesk</span>
            <span id="startup-elapsed"></span>
          </div>
          <div role="status">
            <h1 id="startup-heading"></h1>
            <p id="startup-detail"></p>
          </div>
          <progress id="startup-meter" max="1" aria-labelledby="startup-heading"></progress>
          <div class="startup-transfer">
            <span id="startup-amount"></span>
            <span id="startup-estimate"></span>
          </div>
          <ul id="startup-artifacts"></ul>
          <ol id="session-steps" class="startup-steps" aria-label="Session startup">
            <li data-step="image">Prepare image</li>
            <li data-step="vm">Start virtual machine</li>
            <li data-step="jupyter">Open JupyterLab</li>
          </ol>
        </section>
      </main>

      <script>
      const progressSvg = document.querySelector('#progress-logo svg');
      const progressTitle = document.getElementById('progress-title');
      const progressDetail = document.getElementById('progress-detail');
      const childProcessLog = document.getElementById('child-process-log');
      const legacy = document.getElementById('legacy-progress');
      const startup = document.getElementById('startup-progress');
      const heading = document.getElementById('startup-heading');
      const description = document.getElementById('startup-detail');
      const amount = document.getElementById('startup-amount');
      const estimate = document.getElementById('startup-estimate');
      const elapsed = document.getElementById('startup-elapsed');
      const meter = document.getElementById('startup-meter');
      const artifacts = document.getElementById('startup-artifacts');
      const sessionSteps = document.getElementById('session-steps');
      let startedAt = 0;

      function updateElapsed() {
        if (!startup.hidden) {
          const seconds = Math.floor((Date.now() - startedAt) / 1000);
          elapsed.textContent = seconds < 60
            ? seconds + 's elapsed'
            : Math.floor(seconds / 60) + 'm ' + seconds % 60 + 's elapsed';
        }
      }
      setInterval(updateElapsed, 1000);

      function sendMessageToMain(message, ...args) {
        window.electronAPI.sendMessageToMain(message, ...args);
      }

      function showChildProcessLog(detail) {
        childProcessLog.textContent =
          (childProcessLog.textContent + (detail || '')).slice(-16000);
        childProcessLog.style.whiteSpace = 'pre-wrap';
        childProcessLog.scrollTop = childProcessLog.scrollHeight;
      }

      function showProgress(title, detail, showAnimation) {
        startup.hidden = true;
        legacy.hidden = false;
        legacy.style.display = '';
        progressTitle.innerHTML = title || '';
        progressDetail.innerHTML = detail || '';

        if (showAnimation) {
          progressSvg.unpauseAnimations();
        } else {
          progressSvg.pauseAnimations();
        }
      }

      function showStartupProgress(status) {
        if (startup.hidden) {
          startedAt = Date.now();
        }
        startup.hidden = false;
        legacy.hidden = true;
        legacy.style.display = 'none';
        progressSvg.pauseAnimations();
        if (heading.textContent !== status.title) heading.textContent = status.title;
        if (description.textContent !== status.detail) description.textContent = status.detail;
        const steps = Array.from(sessionSteps.children);
        const active = steps.findIndex(step => step.dataset.step === status.step);
        steps.forEach((step, index) => {
          step.dataset.state = index < active ? 'complete' : '';
          if (index === active) step.setAttribute('aria-current', 'step');
          else step.removeAttribute('aria-current');
        });
        const transfer = status.transfer;
        if (transfer?.fraction === undefined) meter.removeAttribute('value');
        else meter.value = transfer.fraction;
        amount.textContent = transfer?.amount || '';
        estimate.textContent = transfer?.estimate || '';
        artifacts.replaceChildren(...(transfer?.artifacts || []).map(artifact => {
          const row = document.createElement('li');
          row.className = 'startup-artifact';
          const name = document.createElement('span');
          name.textContent = artifact.name;
          const state = document.createElement('span');
          state.textContent = artifact.status;
          row.append(name, state);
          return row;
        }));
        updateElapsed();
      }

      window.electronAPI.onGetChildProcressLog((detail) => {
        showChildProcessLog(detail);
      });

      window.electronAPI.onShowProgress((title, detail, showAnimation) => {
        showProgress(title, detail, showAnimation);
      });
      window.electronAPI.onStartupProgress(showStartupProgress);

      </script>
    `;

    this._pageBody = ejs.render(template, {});
  }

  get view(): ThemedView {
    return this._view;
  }

  load() {
    this._viewReady = new Promise<void>(resolve => {
      this._view.view.webContents.on('dom-ready', () => {
        resolve();
      });
    });

    this._view.loadViewContent(this._pageBody);
  }

  setProgress(title: string, detail: string, showAnimation: boolean) {
    this._viewReady.then(() => {
      this._view.view.webContents.send(
        EventTypeRenderer.ShowProgress,
        title,
        detail,
        showAnimation
      );
    });
  }

  setChildProcessLog(detail: string) {
    console.debug('setChildProcessLog', detail);
    this._viewReady.then(() => {
      this._view.view.webContents.send(
        EventTypeRenderer.ShowChildProcressLog,
        detail
      );
    });
  }

  setStartupProgress(status: StartupProgress) {
    this._viewReady.then(() => {
      const contents = this._view.view.webContents;
      if (!contents.isDestroyed()) {
        contents.send(EventTypeRenderer.ShowStartupProgress, status);
      }
    });
  }

  private _view: ThemedView;
  private _viewReady: Promise<void>;
  private _pageBody: string;
}

export namespace ProgressView {
  export interface IOptions {
    isDarkTheme: boolean;
  }
}
