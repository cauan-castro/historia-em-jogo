class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // ---------------------------------------------------------
    // CONFIGURAÇÕES DA FASE — ajuste aqui para calibrar o jogo
    // ---------------------------------------------------------
    this.cfg = {
      cellSize: 20,          // tamanho da célula da grade lógica (para % revelado)
      playerSpeed: 260,      // pixels por segundo
      revealRadius: 95,      // raio (px) de névoa dissipada ao redor do jogador
      winPercent: 75,        // % do mapa que precisa ser revelado para vencer
      poiCount: 16,          // quantidade de pontos de interesse (riquezas/fauna/flora)
      poiDiscoverRadius: 70  // distância para um ponto de interesse ser "descoberto"
    };

    this.mapW = this.scale.width;
    this.mapH = this.scale.height;
    this.gameWon = false;
    this.lastRevealX = -9999;
    this.lastRevealY = -9999;

    this.cameras.main.setBackgroundColor('#0b1020');

    this.drawTerrain();
    this.spawnPois();
    this.createFog();
    this.createPlayer();
    this.createHud();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');

    // grade lógica de revelação (não é desenhada — só serve para calcular % e vitória)
    this.cols = Math.ceil(this.mapW / this.cfg.cellSize);
    this.rows = Math.ceil(this.mapH / this.cfg.cellSize);
    this.revealedGrid = new Array(this.cols * this.rows).fill(false);
    this.revealedCount = 0;
    this.totalCells = this.cols * this.rows;

    // revela a área do desembarque assim que a fase começa
    this.revealAt(this.player.x, this.player.y);
    this.lastRevealX = this.player.x;
    this.lastRevealY = this.player.y;
  }

  // =========================================================
  // TERRENO (visual estático, no estilo comic book do jogo)
  // =========================================================
  drawTerrain() {
    const g = this.add.graphics().setDepth(0);

    // base: mata / terreno
    g.fillStyle(0x2d5b4c, 1);
    g.fillRect(0, 0, this.mapW, this.mapH);

    // faixa de costa (mar -> areia) à esquerda, ponto de desembarque
    g.fillGradientStyle(0x6fa8dc, 0xc9b27a, 0x6fa8dc, 0xc9b27a, 1);
    g.fillRect(0, 0, this.mapW * 0.12, this.mapH);

    // manchas de floresta mais densa
    g.fillStyle(0x1f4a34, 1);
    for (let i = 0; i < 22; i++) {
      const x = this.mapW * 0.16 + Math.random() * this.mapW * 0.8;
      const y = Math.random() * this.mapH;
      const r = 26 + Math.random() * 38;
      g.fillCircle(x, y, r);
    }

    // rio serpenteante
    g.lineStyle(12, 0x2f6b8a, 1);
    g.beginPath();
    g.moveTo(this.mapW * 0.32, 0);
    for (let y = 0; y <= this.mapH; y += 30) {
      g.lineTo(this.mapW * 0.32 + Math.sin(y / 55) * 55, y);
    }
    g.strokePath();

    // clareiras mais claras
    g.fillStyle(0xe8d9a0, 0.3);
    for (let i = 0; i < 9; i++) {
      const x = this.mapW * 0.16 + Math.random() * this.mapW * 0.8;
      const y = Math.random() * this.mapH;
      const r = 16 + Math.random() * 22;
      g.fillCircle(x, y, r);
    }
  }

  // =========================================================
  // PONTOS DE INTERESSE (riquezas, fauna, flora)
  // =========================================================
  spawnPois() {
    const POI_TYPES = [
      { type: 'riqueza', icon: '💰', label: 'Riqueza' },
      { type: 'fauna', icon: '🦜', label: 'Fauna' },
      { type: 'flora', icon: '🌿', label: 'Flora' }
    ];

    this.pois = [];
    this.totalsByType = { riqueza: 0, fauna: 0, flora: 0 };
    this.discoveredCounts = { riqueza: 0, fauna: 0, flora: 0 };

    for (let i = 0; i < this.cfg.poiCount; i++) {
      const t = Phaser.Utils.Array.GetRandom(POI_TYPES);
      const x = this.mapW * 0.18 + Math.random() * this.mapW * 0.78;
      const y = 24 + Math.random() * (this.mapH - 48);

      // os ícones ficam ocultos pela névoa (depth mais baixo) até o jogador se aproximar
      const textObj = this.add.text(x, y, t.icon, { fontSize: '28px' })
        .setOrigin(0.5)
        .setDepth(1);

      this.pois.push({ x, y, type: t.type, label: t.label, discovered: false, textObj });
      this.totalsByType[t.type]++;
    }
  }

  // =========================================================
  // NÉVOA — mantida como camada invisível para preservar a lógica do jogo
  // =========================================================
  // =========================================================
  // NÉVOA — (SISTEMA DE TILES BASEADO NA SUA GRADE)
  // =========================================================
  createFog() {
    // 1. Inicializa a matemática da grade AQUI (antes de dar problema)
    this.cols = Math.ceil(this.mapW / this.cfg.cellSize);
    this.rows = Math.ceil(this.mapH / this.cfg.cellSize);
    
    // Array lógico (o seu original) e o Novo Array Visual
    this.revealedGrid = new Array(this.cols * this.rows).fill(false);
    this.fogTiles = new Array(this.cols * this.rows); 
    
    this.revealedCount = 0;
    this.totalCells = this.cols * this.rows;

    // 2. Cria os "quadradinhos" pretos cobrindo o mapa
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const idx = cy * this.cols + cx;
        const x = cx * this.cfg.cellSize;
        const y = cy * this.cfg.cellSize;

        // Cria um retângulo preto opaco para cada célula
        const tile = this.add.rectangle(x, y, this.cfg.cellSize, this.cfg.cellSize, 0x000000, 1);
        tile.setOrigin(0, 0);
        tile.setDepth(50); // Fica acima do chão, mas abaixo do jogador (depth 60)
        
        this.fogTiles[idx] = tile;
      }
    }
  }
  revealAt(x, y) {
    const r = this.cfg.revealRadius;
    const minCx = Math.max(0, Math.floor((x - r) / this.cfg.cellSize));
    const maxCx = Math.min(this.cols - 1, Math.floor((x + r) / this.cfg.cellSize));
    const minCy = Math.max(0, Math.floor((y - r) / this.cfg.cellSize));
    const maxCy = Math.min(this.rows - 1, Math.floor((y + r) / this.cfg.cellSize));

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const idx = cy * this.cols + cx;
        
        // Se a célula já foi revelada, ignora e pula para a próxima
        if (this.revealedGrid[idx]) continue;
        
        const centerX = cx * this.cfg.cellSize + this.cfg.cellSize / 2;
        const centerY = cy * this.cfg.cellSize + this.cfg.cellSize / 2;
        
        if (Phaser.Math.Distance.Between(centerX, centerY, x, y) <= r) {
          
          // Lógica original: marca na memória que foi revelado
          this.revealedGrid[idx] = true;
          this.revealedCount++;
          
          // LÓGICA VISUAL: Desaparece com o retângulo preto da tela
          if (this.fogTiles && this.fogTiles[idx]) {
             // O Tween dá um efeito de fade out suave de 300 milissegundos
             this.tweens.add({
               targets: this.fogTiles[idx],
               alpha: 0,
               duration: 300
             });
          }
        }
      }
    }
  }
  // =========================================================
  // JOGADOR (explorador português)
  // =========================================================
  createPlayer() {
    this.player = this.add.container(this.mapW * 0.08, this.mapH / 2).setDepth(60);

    const body = this.add.circle(0, 0, 12, 0xe8c887).setStrokeStyle(3, 0x000000);
    const hatBrim = this.add.ellipse(0, -10, 30, 10, 0x4b2e1f).setStrokeStyle(2, 0x000000);
    const hatTop = this.add.rectangle(0, -18, 14, 14, 0x6b4a2b).setStrokeStyle(2, 0x000000);

    this.player.add([body, hatBrim, hatTop]);
  }

  movePlayer(dt) {
    let dx = 0, dy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      this.player.x += dx * this.cfg.playerSpeed * dt;
      this.player.y += dy * this.cfg.playerSpeed * dt;
      this.player.x = Phaser.Math.Clamp(this.player.x, 14, this.mapW - 14);
      this.player.y = Phaser.Math.Clamp(this.player.y, 14, this.mapH - 14);
    }
  }

  // =========================================================
  // HUD — barra de progresso + contadores de descoberta
  // =========================================================
  createHud() {
    const barW = 240, barH = 18;
    const barX = 24, barY = 16;

    this.add.rectangle(0, 0, this.mapW, 56, 0x14263b, 0.85)
      .setOrigin(0, 0).setDepth(100).setScrollFactor(0);

    this.add.rectangle(barX, barY, barW, barH, 0x2a2015)
      .setOrigin(0, 0).setStrokeStyle(2, 0x000000).setDepth(101).setScrollFactor(0);

    this.hudBarFill = this.add.rectangle(barX + 1, barY + 1, 1, barH - 2, 0xffd166)
      .setOrigin(0, 0).setDepth(102).setScrollFactor(0);

    this.hudBarMaxW = barW - 2;

    this.hudPctText = this.add.text(barX + barW + 14, barY - 3, '0%', {
      fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
      fontSize: '20px', fontStyle: 'bold', color: '#fff6c4',
      stroke: '#000000', strokeThickness: 4
    }).setDepth(102).setScrollFactor(0);

    this.hudDiscoveryText = this.add.text(this.mapW - 24, 26, '💰 0  🦜 0  🌿 0', {
      fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
      fontSize: '18px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(1, 0.5).setDepth(102).setScrollFactor(0);
  }

  updateProgressHud(pct) {
    this.hudBarFill.width = Math.max(1, (pct / 100) * this.hudBarMaxW);
    this.hudPctText.setText(Math.floor(pct) + '%');
    this.hudDiscoveryText.setText(
      `💰 ${this.discoveredCounts.riqueza}  🦜 ${this.discoveredCounts.fauna}  🌿 ${this.discoveredCounts.flora}`
    );
  }

  // =========================================================
  // DESCOBERTAS (riquezas, fauna, flora)
  // =========================================================
  checkPoiDiscoveries() {
    this.pois.forEach(p => {
      if (p.discovered) return;
      const dist = Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y);
      if (dist <= this.cfg.poiDiscoverRadius) {
        p.discovered = true;
        this.discoveredCounts[p.type]++;
        this.showToast(`Descoberta: ${p.label}!`);
      }
    });
  }

  showToast(text) {
    const toast = this.add.text(this.mapW / 2, 70, text, {
      fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
      fontSize: '20px', fontStyle: 'bold', color: '#fff6c4',
      stroke: '#000000', strokeThickness: 4,
      backgroundColor: '#00000088',
      padding: { x: 10, y: 4 }
    }).setOrigin(0.5).setDepth(110).setScrollFactor(0).setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: 56,
      duration: 260,
      yoyo: true,
      hold: 1400,
      onComplete: () => toast.destroy()
    });
  }

  // =========================================================
  // CONDIÇÃO DE VITÓRIA
  // =========================================================
  checkWinCondition(pct) {
    if (this.gameWon || pct < this.cfg.winPercent) return;
    this.gameWon = true;
    this.showWinPanel(pct);
  }

  showWinPanel(pct) {
    const boxW = this.mapW * 0.5, boxH = 220;
    const boxX = this.mapW / 2 - boxW / 2, boxY = this.mapH / 2 - boxH / 2;

    this.add.rectangle(0, 0, this.mapW, this.mapH, 0x000000, 0.55)
      .setOrigin(0, 0).setDepth(199).setScrollFactor(0);

    const box = this.add.graphics().setDepth(200).setScrollFactor(0);
    box.fillStyle(0xfffde7, 1);
    box.fillRect(boxX, boxY, boxW, boxH);
    box.lineStyle(4, 0x000000, 1);
    box.strokeRect(boxX, boxY, boxW, boxH);

    this.add.text(this.mapW / 2, boxY + 44, '🎉 Fase Concluída!', {
      fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
      fontSize: '30px', fontStyle: 'bold', color: '#111111'
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

    const total = this.totalsByType.riqueza + this.totalsByType.fauna + this.totalsByType.flora;
    const found = this.discoveredCounts.riqueza + this.discoveredCounts.fauna + this.discoveredCounts.flora;

    this.add.text(
      this.mapW / 2, boxY + 92,
      `Território revelado: ${Math.floor(pct)}%\nDescobertas: ${found}/${total}`,
      {
        fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
        fontSize: '18px', color: '#333333', align: 'center'
      }
    ).setOrigin(0.5).setDepth(201).setScrollFactor(0);

    const btnY = boxY + boxH - 34;
    const btnBg = this.add.rectangle(this.mapW / 2, btnY, boxW - 60, 42, 0xffeb3b)
      .setStrokeStyle(3, 0x000000).setDepth(201).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.add.text(this.mapW / 2, btnY, 'Reiniciar exploração', {
      fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
      fontSize: '16px', color: '#000000'
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

    // TODO: quando a próxima cena existir, trocar por this.scene.start('NomeDaProximaCena')
    btnBg.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  // =========================================================
  // LOOP PRINCIPAL
  // =========================================================
  update(time, delta) {
    if (this.gameWon) return;

    const dt = delta / 1000;
    this.movePlayer(dt);

    const moved = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this.lastRevealX, this.lastRevealY
    ) > 6;

    if (moved) {
      this.revealAt(this.player.x, this.player.y);
      this.lastRevealX = this.player.x;
      this.lastRevealY = this.player.y;

      this.checkPoiDiscoveries();

      const pct = (this.revealedCount / this.totalCells) * 100;
      this.updateProgressHud(pct);
      this.checkWinCondition(pct);
    }
  }
}

window.GameScene = GameScene;
