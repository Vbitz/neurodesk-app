/** Add an app-owned launcher card without relying on private Jupyter plugin internals.
 * MutationObserver reattaches it when Jupyter creates/renders another launcher.
 * This bridge exposes only the fixed desktop action, not backend credentials/RPC.
 */
export function installDesktopLauncher(
  document: Document,
  open: () => void,
  starting = false
) {
  const updateButton = (button: HTMLButtonElement) => {
    button.disabled = starting;
    button.setAttribute('aria-busy', String(starting));
    button.querySelector('.jp-LauncherCard-label p').textContent = starting
      ? 'Starting desktop…'
      : 'Desktop';
  };
  const desktopIcon = (size: number) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('aria-hidden', 'true');
    const outline = document.createElementNS(svg.namespaceURI, 'path');
    outline.setAttribute('d', 'M3 4h18v13H3z M12 17v4m-4 0h8');
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', 'var(--jp-brand-color1)');
    outline.setAttribute('stroke-width', '1.7');
    outline.setAttribute('stroke-linecap', 'round');
    outline.setAttribute('stroke-linejoin', 'round');
    svg.append(outline);
    return svg;
  };
  const update = () => {
    document.querySelectorAll('.jp-Launcher-content').forEach(content => {
      if (content.querySelector('[data-neurodesk-native-desktop]')) {
        return;
      }
      const section = document.createElement('section');
      section.dataset.neurodeskNativeDesktop = 'true';
      section.className = 'jp-Launcher-section';
      const header = document.createElement('div');
      header.className = 'jp-Launcher-sectionHeader';
      const headerIcon = desktopIcon(28);
      headerIcon.style.marginInlineEnd = '12px';
      const heading = document.createElement('h2');
      heading.textContent = 'Native desktop';
      heading.className = 'jp-Launcher-sectionTitle';
      header.append(headerIcon, heading);
      const cards = document.createElement('div');
      cards.className = 'jp-Launcher-cardContainer';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'jp-LauncherCard';
      button.title = 'Start the Linux desktop and open its native window';
      const icon = document.createElement('div');
      icon.className = 'jp-LauncherCard-icon';
      icon.append(desktopIcon(46));
      const label = document.createElement('div');
      label.className = 'jp-LauncherCard-label';
      const title = document.createElement('p');
      title.setAttribute('role', 'status');
      label.append(title);
      button.append(icon, label);
      updateButton(button);
      button.addEventListener('click', open);
      cards.append(button);
      section.append(header, cards);
      const firstGroup = content.querySelector('.jp-Launcher-section');
      if (firstGroup) {
        firstGroup.after(section);
      } else {
        content.append(section);
      }
    });
  };
  const observer = new MutationObserver(update);
  observer.observe(document.body, { childList: true, subtree: true });
  update();
  window.addEventListener('unload', () => observer.disconnect(), {
    once: true
  });
  return (value: boolean) => {
    starting = value;
    document
      .querySelectorAll<HTMLButtonElement>(
        '[data-neurodesk-native-desktop] button'
      )
      .forEach(updateButton);
  };
}
