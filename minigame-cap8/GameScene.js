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
      poiDiscoverRadius: 70, // distância para um ponto de interesse ser "descoberto"

      // --- Fauna Oculta e Alerta de Perigo (Re-fogging) ---
      faunaCountMin: 3,          // quantidade mínima de animais ocultos
      faunaCountMax: 5,          // quantidade máxima de animais ocultos
      faunaMinSpawnDist: 180,    // distância mínima do ponto de desembarque do jogador
      faunaWarningRadius: 120,   // raio (px) em que a "pista" de perigo aparece
      faunaCollisionRadius: 40,  // raio (px) em que a emboscada é acionada
      faunaRefogRadius: 130,     // raio (px) da área que volta a ficar coberta pela névoa
      faunaWarningCooldown: 1500 // intervalo (ms) entre pistas repetidas do mesmo animal
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
    this.spawnHiddenFauna();
    this.createHud();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');

    // Grade lógica de revelação (calcula % e vitória)
    this.cols = Math.ceil(this.mapW / this.cfg.cellSize);
    this.rows = Math.ceil(this.mapH / this.cfg.cellSize);
    this.revealedGrid = new Array(this.cols * this.rows).fill(false);
    this.revealedCount = 0;
    this.totalCells = this.cols * this.rows;

    // Revela a área do desembarque assim que a fase começa
    this.revealAt(this.player.x, this.player.y);
    this.lastRevealX = this.player.x;
    this.lastRevealY = this.player.y;
  }

  // =========================================================
  // TERRENO (visual estático)
  // =========================================================
  drawTerrain() {
    const g = this.add.graphics().setDepth(0);

    // Base: mata / terreno
    g.fillStyle(0x2d5b4c, 1);
    g.fillRect(0, 0, this.mapW, this.mapH);

    // Faixa de costa (mar -> areia) à esquerda
    g.fillGradientStyle(0x6fa8dc, 0xc9b27a, 0x6fa8dc, 0xc9b27a, 1);
    g.fillRect(0, 0, this.mapW * 0.12, this.mapH);

    // Manchas de floresta mais densa
    g.fillStyle(0x1f4a34, 1);
    for (let i = 0; i < 22; i++) {
      const x = this.mapW * 0.16 + Math.random() * this.mapW * 0.8;
      const y = Math.random() * this.mapH;
      const r = 26 + Math.random() * 38;
      g.fillCircle(x, y, r);
    }

    // Rio serpenteante
    g.lineStyle(12, 0x2f6b8a, 1);
    g.beginPath();
    g.moveTo(this.mapW * 0.32, 0);
    for (let y = 0; y <= this.mapH; y += 30) {
      g.lineTo(this.mapW * 0.32 + Math.sin(y / 55) * 55, y);
    }
    g.strokePath();

    // Clareiras mais claras
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

      const textObj = this.add.text(x, y, t.icon, { fontSize: '28px' })
        .setOrigin(0.5)
        .setDepth(1);

      this.pois.push({ x, y, type: t.type, label: t.label, discovered: false, textObj });
      this.totalsByType[t.type]++;
    }
  }

  // =========================================================
  // NÉVOA — RenderTexture Direta (Sem linhas de grade!)
  // =========================================================
  createFog() {
    this.cols = Math.ceil(this.mapW / this.cfg.cellSize);
    this.rows = Math.ceil(this.mapH / this.cfg.cellSize);

    this.revealedGrid = new Array(this.cols * this.rows).fill(false);
    this.revealedCount = 0;
    this.totalCells = this.cols * this.rows;

    this.ensureFogTextures();

    // Carimbo do pincel radial (agora usado para criar as nuvens E apagar)
    this.fogBrushStamp = this.make.image({ key: 'fogBrush', add: false }).setOrigin(0.5);

    // 1. Cria a RenderTexture cobrindo a TELA INTEIRA
    this.fogTexture = this.add.renderTexture(0, 0, this.mapW, this.mapH);
    this.fogTexture.setOrigin(0, 0);
    this.fogTexture.setDepth(50);

    // 2. Preenche com a cor escura base da névoa
    this.fogTexture.fill(0x1a2636, 0.95);

    // 3. Pinta manchas orgânicas de nuvem (adeus, padrão de grade!)
    // Calcula uma quantidade de manchas proporcional ao tamanho do mapa
    const numClouds = Math.floor((this.mapW * this.mapH) / 8000); 

    for (let i = 0; i < numClouds; i++) {
      const cx = Phaser.Math.Between(0, this.mapW);
      const cy = Phaser.Math.Between(0, this.mapH);
      const scale = Phaser.Math.FloatBetween(0.8, 3.5);   // Tamanhos variados
      const alpha = Phaser.Math.FloatBetween(0.05, 0.20); // Transparência suave

      // Configura o carimbo para pintar a nuvem
      this.fogBrushStamp.setPosition(cx, cy)
                        .setScale(scale)
                        .setTint(0xc9d3db) // Cor da nuvem
                        .setAlpha(alpha);

      // Desenha na textura
      this.fogTexture.draw(this.fogBrushStamp);
    }

    // 4. IMPORTANTE: Limpa o carimbo para que ele volte a funcionar 
    // como "borracha invisível" na hora que o jogador for andar (revealAt)
    this.fogBrushStamp.clearTint().setAlpha(1);
  }

  ensureFogTextures() {
    // Só precisamos do pincel radial agora. A textura quadrada (cloudTex) foi removida!
    if (!this.textures.exists('fogBrush')) {
      const size = 256;
      const brush = this.textures.createCanvas('fogBrush', size, size);
      const ctx = brush.getContext();
      const cx = size / 2, cy = size / 2, r = size / 2;
      
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.7, 'rgba(255,255,255,0.85)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      brush.refresh();
    }
  }

  revealAt(x, y) {
    const r = this.cfg.revealRadius;
    const minCx = Math.max(0, Math.floor((x - r) / this.cfg.cellSize));
    const maxCx = Math.min(this.cols - 1, Math.floor((x + r) / this.cfg.cellSize));
    const minCy = Math.max(0, Math.floor((y - r) / this.cfg.cellSize));
    const maxCy = Math.min(this.rows - 1, Math.floor((y + r) / this.cfg.cellSize));

    let revealedSomething = false;

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const idx = cy * this.cols + cx;
        if (this.revealedGrid[idx]) continue;

        const centerX = cx * this.cfg.cellSize + this.cfg.cellSize / 2;
        const centerY = cy * this.cfg.cellSize + this.cfg.cellSize / 2;

        if (Phaser.Math.Distance.Between(centerX, centerY, x, y) <= r) {
          this.revealedGrid[idx] = true;
          this.revealedCount++;
          revealedSomething = true;
        }
      }
    }

    if (revealedSomething && this.fogTexture) {
      // Apaga a névoa suavemente direto na RenderTexture
      this.fogBrushStamp.setPosition(x, y).setScale((r * 2) / 256);
      this.fogTexture.erase(this.fogBrushStamp);
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
  // HUD — barra de progresso + contadores
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
  // DESCOBERTAS
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
  // FAUNA OCULTA E RE-FOGGING
  // =========================================================
  spawnHiddenFauna() {
    const FAUNA_TYPES = [
      { type: 'onca', icon: '🐆', label: 'Onça' },
      { type: 'serpente', icon: '🐍', label: 'Serpente' }
    ];

    this.hiddenFauna = [];
    const count = Phaser.Math.Between(this.cfg.faunaCountMin, this.cfg.faunaCountMax);

    for (let i = 0; i < count; i++) {
      let x, y, tries = 0;

      do {
        x = this.mapW * 0.18 + Math.random() * this.mapW * 0.78;
        y = 24 + Math.random() * (this.mapH - 48);
        tries++;
      } while (
        Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < this.cfg.faunaMinSpawnDist &&
        tries < 30
      );

      const t = Phaser.Utils.Array.GetRandom(FAUNA_TYPES);

      const textObj = this.add.text(x, y, t.icon, { fontSize: '26px' })
        .setOrigin(0.5)
        .setDepth(1)
        .setAlpha(0.95);

      this.hiddenFauna.push({
        x, y,
        type: t.type,
        label: t.label,
        triggered: false,
        lastWarningAt: 0,
        textObj
      });
    }
  }

  checkFaunaEncounters() {
    if (!this.hiddenFauna) return;

    this.hiddenFauna.forEach(f => {
      if (f.triggered) return;

      const dist = Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y);

      if (dist <= this.cfg.faunaCollisionRadius) {
        this.triggerAmbush(f);
        return;
      }

      if (dist <= this.cfg.faunaWarningRadius) {
        this.maybeShowWarningClue(f);
      }
    });
  }

  maybeShowWarningClue(f) {
    const now = this.time.now;
    if (now - f.lastWarningAt < this.cfg.faunaWarningCooldown) return;
    f.lastWarningAt = now;

    const midX = (this.player.x + f.x) / 2;
    const midY = (this.player.y + f.y) / 2;

    const footprint = this.add.text(midX, midY, '🐾', { fontSize: '22px' })
      .setOrigin(0.5)
      .setDepth(55)
      .setAlpha(0);

    this.tweens.add({
      targets: footprint,
      alpha: 0.9,
      duration: 250,
      yoyo: true,
      hold: 500,
      onComplete: () => footprint.destroy()
    });
  }

  triggerAmbush(f) {
    f.triggered = true;

    this.showToast(`⚠️ Cuidado! ${f.label} à vista!`);
    this.cameras.main.shake(220, 0.006);

    this.reFogArea(f.x, f.y, this.cfg.faunaRefogRadius);
  }

  reFogArea(x, y, radius) {
    const minCx = Math.max(0, Math.floor((x - radius) / this.cfg.cellSize));
    const maxCx = Math.min(this.cols - 1, Math.floor((x + radius) / this.cfg.cellSize));
    const minCy = Math.max(0, Math.floor((y - radius) / this.cfg.cellSize));
    const maxCy = Math.min(this.rows - 1, Math.floor((y + radius) / this.cfg.cellSize));

    let revertedSomething = false;

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const idx = cy * this.cols + cx;

        if (!this.revealedGrid[idx]) continue;

        const centerX = cx * this.cfg.cellSize + this.cfg.cellSize / 2;
        const centerY = cy * this.cfg.cellSize + this.cfg.cellSize / 2;

        if (Phaser.Math.Distance.Between(centerX, centerY, x, y) <= radius) {
          this.revealedGrid[idx] = false;
          this.revealedCount--;
          revertedSomething = true;
        }
      }
    }

    if (revertedSomething && this.fogTexture) {
      // Repinta a névoa de volta no lugar aplicando um tint escuro no stamp
      this.fogBrushStamp.setPosition(x, y).setScale((radius * 2) / 256).setTint(0x1a2636);
      this.fogTexture.draw(this.fogBrushStamp);
      this.fogBrushStamp.clearTint(); // Limpa o tint para não afetar os próximos erase()
    }

    const pct = (this.revealedCount / this.totalCells) * 100;
    this.updateProgressHud(pct);
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

    this.checkFaunaEncounters();

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
