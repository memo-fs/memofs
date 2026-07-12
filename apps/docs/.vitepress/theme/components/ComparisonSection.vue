<template>
  <section id="comparison" class="comparison-section tek-reveal">
    <div class="container">
      <p class="tek-kicker">Why file-first</p>
      <h2 class="tek-h2">MemoFS vs. hosted memory tools</h2>
      <p class="tek-lede">
        Most memory tools hide your data in a dashboard you can't inspect. MemoFS stores
        everything as plain text and JSON in your project's <code>.memofs/</code> directory —
        alongside the code it describes.
      </p>
      <div class="comparison-table-wrapper tek-glass">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th class="col-memofs">MemoFS</th>
              <th class="col-hosted">Hosted Memory Tools</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Where memory lives</td>
              <td class="col-memofs"><span class="comparison-table-check">✓</span> Plain files in your repo</td>
              <td class="col-hosted"><span class="comparison-table-cross">Locked in a remote dashboard</span></td>
            </tr>
            <tr>
              <td>Inspect &amp; edit</td>
              <td class="col-memofs"><span class="comparison-table-check">✓</span> Any editor, any diff tool</td>
              <td class="col-hosted"><span class="comparison-table-cross">Vendor UI only</span></td>
            </tr>
            <tr>
              <td>Version control</td>
              <td class="col-memofs"><span class="comparison-table-check">✓</span> Git-tracked with your code</td>
              <td class="col-hosted"><span class="comparison-table-cross">Separate system (if at all)</span></td>
            </tr>
            <tr>
              <td>Ownership</td>
              <td class="col-memofs"><span class="comparison-table-check">✓</span> You own every byte</td>
              <td class="col-hosted"><span class="comparison-table-cross">Vendor-dependent</span></td>
            </tr>
            <tr>
              <td>Offline support</td>
              <td class="col-memofs"><span class="comparison-table-check">✓</span> Full offline by default</td>
              <td class="col-hosted"><span class="comparison-table-cross">Requires internet</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <section class="support-section">
        <div class="support-card">
          <p class="support-kicker">Support MemoFS</p>
          <p class="support-body">
            If MemoFS saves you time, a star helps others find it. If it helps your work, consider sponsoring.
          </p>
          <div class="support-actions">
            <a
              href="https://github.com/memo-fs/memofs"
              target="_blank"
              rel="noopener noreferrer"
              class="support-btn"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.744 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              ★ Star on GitHub
            </a>
            <a
              href="https://github.com/sponsors/christophersesugh"
              target="_blank"
              rel="noopener noreferrer"
              class="support-btn sponsor-btn"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Sponsor on GitHub
            </a>
          </div>
          <a
            href="https://github.com/memo-fs/memofs/discussions"
            target="_blank"
            rel="noopener noreferrer"
            class="support-link"
          >
            Join Discussions
          </a>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.container {
  max-width: var(--tek-container-narrow);
  margin: 0 auto;
  padding: 0 24px;
}

.comparison-section { padding: 0 0 var(--tek-section-pad); }
.comparison-section .tek-kicker { justify-content: center; }
.comparison-section .tek-kicker::before { display: none; }
.comparison-section .tek-h2 { text-align: center; margin-bottom: 16px; }
.comparison-section .tek-lede { margin: 0 auto 36px; text-align: center; }

.comparison-section .tek-lede code {
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: var(--tek-radius);
  font-size: 14px;
  color: var(--tek-c-cyan);
}

.comparison-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--tek-glass-border);
  border-radius: var(--tek-radius);
  box-shadow: var(--tek-shadow-md);
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
  line-height: 1.5;
  text-align: left;
}

.comparison-table th {
  padding: 16px 20px;
  font-family: var(--vp-font-family-display);
  font-weight: 600;
  border-bottom: 2px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.comparison-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}

.comparison-table tr:last-child td { border-bottom: none; }
.comparison-table tr:hover td { background-color: var(--vp-c-bg-mute); }

.comparison-table td:first-child,
.comparison-table th:first-child { font-weight: 600; color: var(--vp-c-text-1); }

.comparison-table .col-memofs {
  background: color-mix(in srgb, var(--tek-c-cyan) 7%, transparent);
  box-shadow:
    inset 1px 0 0 color-mix(in srgb, var(--tek-c-cyan) 35%, transparent),
    inset -1px 0 0 color-mix(in srgb, var(--tek-c-cyan) 35%, transparent);
}

.comparison-table th.col-memofs { color: var(--tek-c-cyan); }

.comparison-table-check { color: var(--tek-c-cyan); font-weight: 700; font-size: 16px; }
.comparison-table-cross { color: var(--vp-c-text-3); font-size: 14px; }

.support-section {
  margin-top: 40px;
}

.support-card {
  padding: 32px;
  text-align: center;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--tek-radius);
  box-shadow: var(--tek-shadow-sm);
}

.support-kicker {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tek-c-cyan);
  margin: 0 0 8px;
}

.support-body {
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0 0 20px;
}

.support-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.support-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-decoration: none;
  background: var(--vp-c-bg);
  border-radius: var(--tek-radius);
  transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.2s;
  white-space: nowrap;
}

.support-btn:hover {
  border-color: var(--tek-c-gold);
  color: var(--tek-c-gold);
  background: color-mix(in srgb, var(--tek-c-gold) 6%, var(--vp-c-bg));
  transform: translateY(-1px);
}

.support-btn.sponsor-btn {
  background: var(--tek-c-cyan);
  color: #fff;
  border-color: var(--tek-c-cyan);
}

.support-btn.sponsor-btn:hover {
  background: var(--vp-c-brand-2);
  border-color: var(--vp-c-brand-2);
  color: #fff;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--tek-c-cyan) 30%, transparent);
}

.support-link {
  display: block;
  margin-top: 16px;
  font-family: var(--vp-font-family-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s;
}

.support-link:hover {
  color: var(--tek-c-cyan);
}

@media (max-width: 640px) {
  .comparison-table-wrapper {
    margin-left: -24px;
    margin-right: -24px;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .comparison-table th,
  .comparison-table td {
    padding: 10px 12px;
    font-size: 13px;
    white-space: nowrap;
  }

  .comparison-table td:first-child {
    white-space: normal;
    min-width: 90px;
  }

  .support-actions {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
