import { GalleryCategory, Project } from './data';

type OpenPayload = {
  project: Project;
  rect: DOMRect;
};

type GalleryEngineOptions = {
  stage: HTMLElement;
  world: HTMLElement;
  projects: Project[];
  category: GalleryCategory;
  onOpen: (payload: OpenPayload) => void;
};

type State = {
  offsetX: number;
  offsetY: number;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
  hoverX: number;
  hoverY: number;
  targetHoverX: number;
  targetHoverY: number;
  isDown: boolean;
  pointerId: number | null;
  lastX: number;
  lastY: number;
  startX: number;
  startY: number;
  lastT: number;
  tileW: number;
  tileH: number;
  gapX: number;
  gapY: number;
  cols: number;
  rows: number;
  pressMoved: boolean;
};

type TileElement = HTMLElement & { __project?: Project | null };
type LayoutCell =
  | {
      type: 'text';
      key: string;
      title: string;
      kicker: string;
      col: number;
      row: number;
      colSpan?: number;
    }
  | {
      type: 'image';
      key: string;
      project: Project;
      col: number;
      row: number;
    };

const logoProject: Project = {
  id: 'logo',
  src: '/pix-logo.svg',
  detailSrc: '/pix-logo.svg',
  title: 'pix',
  tag: 'Logo',
  category: 'fotos',
};

const LOGO_COL = 0;
const LOGO_ROW = 0;

function wrapIndex(value: number, length: number) {
  return ((value % length) + length) % length;
}

export class GalleryEngine {
  private stage: HTMLElement;
  private world: HTMLElement;
  private projects: Project[];
  private category: GalleryCategory;
  private onOpen: (payload: OpenPayload) => void;
  private pool = new Map<string, TileElement>();
  private raf = 0;
  private isPaused = false;
  private curatedCells: LayoutCell[] = [];
  private state: State = {
    offsetX: 0,
    offsetY: 0,
    targetX: 0,
    targetY: 0,
    velocityX: 0,
    velocityY: 0,
    hoverX: 0,
    hoverY: 0,
    targetHoverX: 0,
    targetHoverY: 0,
    isDown: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
    lastT: 0,
    tileW: 310,
    tileH: 310,
    gapX: 30,
    gapY: 38,
    cols: 0,
    rows: 0,
    pressMoved: false,
  };

  private pointerDown = (event: PointerEvent) => {
    if (this.isPaused) return;
    if (!event.isPrimary) return;
    event.preventDefault();
    this.state.isDown = true;
    this.state.pointerId = event.pointerId;
    this.state.pressMoved = false;
    this.stage.classList.add('is-dragging');
    try {
      this.stage.setPointerCapture(event.pointerId);
    } catch {
      // Window listeners below keep the drag alive if pointer capture is not available.
    }
    this.state.lastX = this.state.startX = event.clientX;
    this.state.lastY = this.state.startY = event.clientY;
    this.state.lastT = performance.now();
    this.state.velocityX = 0;
    this.state.velocityY = 0;
  };

  private pointerMove = (event: PointerEvent) => {
    this.updateHoverPan(event);
    if (!this.state.isDown || this.isPaused) return;
    if (this.state.pointerId !== null && event.pointerId !== this.state.pointerId) return;
    event.preventDefault();

    const now = performance.now();
    const dt = Math.max(16, now - this.state.lastT);
    const dx = event.clientX - this.state.lastX;
    const dy = event.clientY - this.state.lastY;

    if (Math.hypot(event.clientX - this.state.startX, event.clientY - this.state.startY) > 10) {
      this.state.pressMoved = true;
    }

    this.state.targetX += dx;
    this.state.targetY += dy;
    this.state.velocityX = (dx / dt) * 16;
    this.state.velocityY = (dy / dt) * 16;
    this.state.lastX = event.clientX;
    this.state.lastY = event.clientY;
    this.state.lastT = now;
  };

  private pointerUp = (event: PointerEvent) => {
    if (!this.state.isDown) return;
    if (this.state.pointerId !== null && event.pointerId !== this.state.pointerId) return;
    const moved = this.state.pressMoved;
    this.state.isDown = false;
    this.state.pointerId = null;
    this.stage.classList.remove('is-dragging');
    try {
      if (this.stage.hasPointerCapture(event.pointerId)) {
        this.stage.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Pointer capture may already be gone after native browser gestures.
    }

    if (!moved && !this.isPaused) {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const tile = element?.closest<TileElement>('.tile');
      if (tile && !tile.classList.contains('is-logo') && tile.__project) {
        this.onOpen({ project: tile.__project, rect: tile.getBoundingClientRect() });
      }
    }
  };

  private wheel = (event: WheelEvent) => {
    if (this.isPaused) return;
    event.preventDefault();
    this.state.targetX -= event.deltaX * 0.8;
    this.state.targetY -= event.deltaY * 0.8;
    this.state.velocityX -= event.deltaX * 0.02;
    this.state.velocityY -= event.deltaY * 0.02;
  };

  private resize = () => {
    this.measure();
    this.render();
  };

  private pointerLeave = () => {
    this.state.targetHoverX = 0;
    this.state.targetHoverY = 0;
  };

  private windowPointerMove = (event: PointerEvent) => {
    this.updateHoverPan(event);
  };

  private windowPointerOut = (event: PointerEvent) => {
    if (event.relatedTarget) return;
    this.state.targetHoverX = 0;
    this.state.targetHoverY = 0;
  };

  constructor(options: GalleryEngineOptions) {
    this.stage = options.stage;
    this.world = options.world;
    this.projects = options.projects;
    this.category = options.category;
    this.onOpen = options.onOpen;
    this.curatedCells = this.createCuratedCells();

    this.stage.addEventListener('pointerdown', this.pointerDown);
    window.addEventListener('wheel', this.wheel, { passive: false });
    window.addEventListener('pointermove', this.pointerMove);
    window.addEventListener('pointerup', this.pointerUp);
    window.addEventListener('pointercancel', this.pointerUp);
    window.addEventListener('pointerout', this.windowPointerOut);
    window.addEventListener('resize', this.resize);

    this.measure();
    this.tick();
  }

  setCategory(category: GalleryCategory) {
    if (this.category === category) return;
    this.category = category;
    this.state.velocityX = 0;
    this.state.velocityY = 0;
    this.state.targetX = 0;
    this.state.targetY = 0;
    this.stage.classList.add('is-filtering');
    this.stage.classList.add('is-arranging');
    for (const tile of this.pool.values()) {
      tile.dataset.category = '';
    }
    this.render();
    window.setTimeout(() => {
      this.stage.classList.remove('is-filtering');
      this.stage.classList.remove('is-arranging');
    }, 520);
  }

  setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.state.isDown = false;
      this.state.pointerId = null;
      this.state.velocityX = 0;
      this.state.velocityY = 0;
      this.stage.classList.remove('is-dragging');
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.stage.removeEventListener('pointerdown', this.pointerDown);
    window.removeEventListener('wheel', this.wheel);
    window.removeEventListener('pointermove', this.pointerMove);
    window.removeEventListener('pointerup', this.pointerUp);
    window.removeEventListener('pointercancel', this.pointerUp);
    window.removeEventListener('pointerout', this.windowPointerOut);
    window.removeEventListener('resize', this.resize);
    this.clearPool();
  }

  private filteredProjects() {
    if (this.category === 'alle') return this.projects;
    return this.projects.filter((project) => project.category === this.category);
  }

  private projectFor(col: number, row: number) {
    const items = this.filteredProjects();
    return items[wrapIndex(col * 5 + row * 7, items.length)] || this.projects[0];
  }

  private tileKindFor(col: number, row: number) {
    if (col === LOGO_COL && row === LOGO_ROW) return { type: 'logo' as const, project: logoProject };
    return { type: 'image' as const, project: this.projectFor(col, row) };
  }

  private createCuratedCells(): LayoutCell[] {
    const photos = this.projects.filter((project) => project.category === 'fotos');
    const videos = this.projects.filter((project) => project.category === 'videos');
    const includes = (project: Project, value: string) => project.id.includes(value);
    const peopleEvents = photos.filter(
      (project) => includes(project, 'menschen') || includes(project, 'event') || includes(project, 'business'),
    );
    const spaces = photos.filter((project) => includes(project, 'immobilien') || includes(project, 'architektur'));

    return [
      { type: 'text', key: 'section-people', title: 'Menschen', kicker: 'Business, Event, Portrait', col: -2, row: 0, colSpan: 2 },
      ...this.placeSection(peopleEvents, 0, [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [-2, 1],
        [-1, 1],
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
        [-2, 2],
        [-1, 2],
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
      ]),
      { type: 'text', key: 'section-spaces', title: 'Immobilien', kicker: 'Architektur, Raeume, Details', col: -2, row: 3, colSpan: 2 },
      ...this.placeSection(spaces, 3, [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [-2, 1],
        [-1, 1],
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
        [-2, 2],
        [-1, 2],
      ]),
      { type: 'text', key: 'section-video', title: 'Video', kicker: 'Film, Social, Motion', col: -2, row: 6, colSpan: 2 },
      ...this.placeSection(videos, 6, [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [-2, 1],
        [-1, 1],
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
      ]),
    ];
  }

  private placeSection(projects: Project[], startRow: number, positions: Array<[number, number]>): LayoutCell[] {
    return projects.slice(0, positions.length).map((project, index) => {
      const [col, row] = positions[index];
      return {
        type: 'image',
        key: project.id,
        project,
        col,
        row: startRow + row,
      };
    });
  }

  centerLogo() {
    const logoWidth = this.state.tileW * 2 + this.state.gapX;
    this.state.targetX = (this.state.tileW - logoWidth) / 2;
    this.state.targetY = 0;
    this.state.velocityX = 0;
    this.state.velocityY = 0;
    this.state.targetHoverX = 0;
    this.state.targetHoverY = 0;
  }

  private measure() {
    const width = window.innerWidth;
    this.state.tileW = Math.max(160, Math.min(340, width * (width < 760 ? 0.46 : 0.22)));
    this.state.tileH = this.state.tileW;
    const baseGap = Math.max(40, Math.min(100, width * 0.06));
    this.state.gapX = baseGap * 0.7;
    this.state.gapY = baseGap * 0.9;
    this.state.cols = Math.ceil(width / (this.state.tileW + this.state.gapX)) + 3;
    this.state.rows = Math.ceil(window.innerHeight / (this.state.tileH + this.state.gapY)) + 3;
    this.stage.style.setProperty('--tile-w', `${this.state.tileW}px`);
    this.stage.style.setProperty('--tile-h', `${this.state.tileH}px`);
  }

  private createTile(key: string) {
    const tile = document.createElement('article') as TileElement;
    tile.className = 'tile';
    tile.dataset.key = key;
    tile.innerHTML = '<div class="tile-inner"></div>';
    this.world.appendChild(tile);
    return tile;
  }

  private updateTileContent(tile: TileElement, col: number, row: number) {
    if (
      tile.dataset.col === String(col) &&
      tile.dataset.row === String(row) &&
      tile.dataset.category === this.category
    ) {
      return;
    }

    const kind = this.tileKindFor(col, row);
    const inner = tile.querySelector('.tile-inner');
    if (!inner) return;

    tile.dataset.col = String(col);
    tile.dataset.row = String(row);
    tile.dataset.category = this.category;
    tile.dataset.type = kind.type;
    tile.classList.toggle('is-logo', kind.type === 'logo');
    tile.__project = kind.type === 'image' ? kind.project : null;

    if (kind.type === 'logo') {
      inner.innerHTML = '<img src="/pix-logo.svg" alt="pix" draggable="false">';
    } else {
      this.crossfadeImage(tile, inner, kind.project);
    }
  }

  private updateLayoutTileContent(tile: TileElement, cell: LayoutCell) {
    if (tile.dataset.cell === cell.key && tile.dataset.category === this.category) return;

    const inner = tile.querySelector('.tile-inner');
    if (!inner) return;

    tile.dataset.cell = cell.key;
    tile.dataset.col = String(cell.col);
    tile.dataset.row = String(cell.row);
    tile.dataset.category = this.category;
    tile.classList.toggle('is-text', cell.type === 'text');
    tile.classList.remove('is-logo');
    tile.dataset.type = cell.type;
    tile.__project = cell.type === 'image' ? cell.project : null;

    if (cell.type === 'text') {
      inner.innerHTML = `<p>${cell.kicker}</p><h2>${cell.title}</h2>`;
      return;
    }

    this.crossfadeImage(tile, inner, cell.project);
  }

  private crossfadeImage(tile: TileElement, inner: Element, project: Project) {
    const current = inner.querySelector<HTMLImageElement>('img.tile-image-current');
    if (current?.getAttribute('src') === project.src) {
      current.alt = project.title;
      return;
    }

    const next = document.createElement('img');
    next.className = 'tile-image-next';
    next.alt = project.title;
    next.src = project.src;
    next.draggable = false;
    next.decoding = 'async';
    inner.appendChild(next);

    const reveal = () => {
      tile.classList.add('is-swapping');
      window.setTimeout(() => {
        current?.remove();
        next.className = 'tile-image-current';
        tile.classList.remove('is-swapping');
      }, 260);
    };

    if (next.complete) {
      window.requestAnimationFrame(reveal);
    } else {
      next.addEventListener('load', () => window.requestAnimationFrame(reveal), { once: true });
      next.addEventListener('error', reveal, { once: true });
    }
  }

  private render() {
    if (this.isPaused) return;
    if (this.category !== 'alle') {
      this.renderFilteredGrid();
      return;
    }
    this.renderCuratedMedia();
  }

  private renderCuratedMedia() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const stepX = this.state.tileW + this.state.gapX;
    const stepY = this.state.tileH + this.state.gapY;
    const centerX = width / 2;
    const centerY = height / 2;
    const activeKeys = new Set<string>();
    const bufferX = stepX * 2.2;
    const bufferY = stepY * 2.2;

    for (const cell of this.curatedCells) {
      const colSpan = cell.type === 'text' ? cell.colSpan ?? 2 : 1;
      const tileWidth = this.state.tileW * colSpan + this.state.gapX * (colSpan - 1);
      const tileHeight = this.state.tileH;
      const px = cell.col * stepX + this.state.offsetX + this.state.hoverX + centerX - this.state.tileW / 2;
      const py = cell.row * stepY + this.state.offsetY + this.state.hoverY + centerY - this.state.tileH / 2;

      if (px > width + bufferX || px + tileWidth < -bufferX || py > height + bufferY || py + tileHeight < -bufferY) {
        continue;
      }

      const key = `curated:${cell.key}`;
      activeKeys.add(key);

      let tile = this.pool.get(key);
      if (!tile) {
        tile = this.createTile(key);
        this.pool.set(key, tile);
      }

      this.updateLayoutTileContent(tile, cell);

      const dx = px + tileWidth / 2 - centerX;
      const ndx = dx / (width * 0.5);
      const sideDist = Math.abs(ndx);
      const z = Math.pow(sideDist, 1.35) * 190;
      const ry = ndx * -17;
      const scale = cell.type === 'text' ? 1 : 1 - Math.min(0.06, sideDist * 0.035);
      const opacity = Math.max(cell.type === 'text' ? 0.72 : 0.14, 1 - Math.pow(sideDist, 1.45) * 0.36);

      tile.style.width = `${tileWidth}px`;
      tile.style.height = `${tileHeight}px`;
      tile.style.transform = `translate3d(${px}px, ${py}px, ${z}px) rotateY(${ry}deg) scale(${scale})`;
      tile.style.opacity = opacity.toFixed(3);
      tile.style.zIndex = String(Math.round(1000 - sideDist * 100));
    }

    for (const [key, tile] of this.pool) {
      if (!activeKeys.has(key)) {
        tile.remove();
        this.pool.delete(key);
      }
    }
  }

  private renderInfiniteGrid() {

    const width = window.innerWidth;
    const height = window.innerHeight;
    const stepX = this.state.tileW + this.state.gapX;
    const stepY = this.state.tileH + this.state.gapY;
    const centerX = width / 2;
    const centerY = height / 2;
    const startCol = Math.floor((-this.state.offsetX - width * 0.5) / stepX);
    const startRow = Math.floor((-this.state.offsetY - height * 0.5) / stepY);
    const activeKeys = new Set<string>();

    for (let y = 0; y < this.state.rows; y += 1) {
      for (let x = 0; x < this.state.cols; x += 1) {
        const col = startCol + x;
        const row = startRow + y;
        if (col === LOGO_COL + 1 && row === LOGO_ROW) continue;
        const key = `${col}:${row}`;
        activeKeys.add(key);

        let tile = this.pool.get(key);
        if (!tile) {
          tile = this.createTile(key);
          this.pool.set(key, tile);
        }

        this.updateTileContent(tile, col, row);

        const isLogo = tile.dataset.type === 'logo';
        const tileWidth = isLogo ? this.state.tileW * 2 + this.state.gapX : this.state.tileW;
        const tileHeight = this.state.tileH;
        const px = col * stepX + this.state.offsetX + this.state.hoverX + centerX - this.state.tileW / 2;
        const py = row * stepY + this.state.offsetY + this.state.hoverY + centerY - this.state.tileH / 2;
        const dx = px + tileWidth / 2 - centerX;
        const ndx = dx / (width * 0.5);
        const sideDist = Math.abs(ndx);
        const z = Math.pow(sideDist, 1.4) * 230;
        const rx = 0;
        const ry = ndx * -23;
        const scale = 1 - Math.min(0.08, sideDist * 0.04);
        const opacity = Math.max(0.1, 1 - Math.pow(sideDist, 1.5) * 0.4);

        tile.style.width = `${tileWidth}px`;
        tile.style.height = `${tileHeight}px`;
        tile.style.transform = `translate3d(${px}px, ${py}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
        tile.style.opacity = opacity.toFixed(3);
        tile.style.zIndex = String(Math.round(1000 - sideDist * 100));
      }
    }

    for (const [key, tile] of this.pool) {
      if (!activeKeys.has(key)) {
        tile.remove();
        this.pool.delete(key);
      }
    }
  }

  private renderFilteredGrid() {
    const items = this.filteredProjects();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const stepX = this.state.tileW + this.state.gapX;
    const stepY = this.state.tileH + this.state.gapY;
    const columns = Math.max(1, Math.min(items.length, Math.ceil(Math.sqrt(items.length * 1.4))));
    const rows = Math.ceil(items.length / columns);
    const gridW = (columns - 1) * stepX + this.state.tileW;
    const gridH = (rows - 1) * stepY + this.state.tileH;
    const startX = width / 2 - gridW / 2;
    const startY = height / 2 - gridH / 2;
    const activeKeys = new Set<string>();

    items.forEach((project, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const key = `filter:${project.id}`;
      activeKeys.add(key);

      let tile = this.pool.get(key);
      if (!tile) {
        tile = this.createTile(key);
        this.pool.set(key, tile);
      }

      const inner = tile.querySelector('.tile-inner');
      if (!inner) return;

      tile.dataset.col = String(col);
      tile.dataset.row = String(row);
      tile.dataset.category = this.category;
      tile.dataset.type = 'image';
      tile.classList.remove('is-logo');
      tile.__project = project;
      this.crossfadeImage(tile, inner, project);

      const px = startX + col * stepX + this.state.hoverX;
      const py = startY + row * stepY + this.state.hoverY;
      const dx = px + this.state.tileW / 2 - width / 2;
      const ndx = dx / (width * 0.5);
      const sideDist = Math.abs(ndx);
      const z = Math.pow(sideDist, 1.4) * 230;
      const rx = 0;
      const ry = ndx * -23;
      const scale = 1 - Math.min(0.08, sideDist * 0.04);
      const opacity = Math.max(0.2, 1 - Math.pow(sideDist, 1.5) * 0.3);

      tile.style.width = `${this.state.tileW}px`;
      tile.style.height = `${this.state.tileH}px`;
      tile.style.transform = `translate3d(${px}px, ${py}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
      tile.style.opacity = opacity.toFixed(3);
      tile.style.zIndex = String(Math.round(1000 - sideDist * 100));
    });

    for (const [key, tile] of this.pool) {
      if (!activeKeys.has(key)) {
        tile.style.opacity = '0';
        window.setTimeout(() => {
          if (!activeKeys.has(key)) {
            tile.remove();
            this.pool.delete(key);
          }
        }, 320);
      }
    }
  }

  private tick = () => {
    if (!this.isPaused) {
      if (!this.state.isDown) {
        this.state.targetX += this.state.velocityX;
        this.state.targetY += this.state.velocityY;
        this.state.velocityX *= 0.94;
        this.state.velocityY *= 0.94;
      }
      this.state.offsetX += (this.state.targetX - this.state.offsetX) * 0.2;
      this.state.offsetY += (this.state.targetY - this.state.offsetY) * 0.2;
      this.state.hoverX += (this.state.targetHoverX - this.state.hoverX) * 0.08;
      this.state.hoverY += (this.state.targetHoverY - this.state.hoverY) * 0.08;
      this.render();
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private updateHoverPan(event: PointerEvent) {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const nx = event.clientX / window.innerWidth - 0.5;
    const ny = event.clientY / window.innerHeight - 0.5;
    const strength = Math.min(26, Math.max(14, window.innerWidth * 0.016));
    this.state.targetHoverX = nx * strength;
    this.state.targetHoverY = ny * strength;
  }

  private clearPool() {
    for (const tile of this.pool.values()) {
      tile.remove();
    }
    this.pool.clear();
  }
}
