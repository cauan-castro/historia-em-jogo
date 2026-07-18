class TutorialScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TutorialScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#122332');

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x14263b).setOrigin(0);
    this.add.rectangle(0, this.scale.height * 0.78, this.scale.width, this.scale.height * 0.22, 0x385e61).setOrigin(0);

    this.add.text(this.scale.width * 0.5, this.scale.height * 0.16, 'Tutorial da Expedição', {
      fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#fff6c4',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(this.scale.width * 0.5, this.scale.height * 0.25, 'A vantagem vai para quem lê o mar.', {
      fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Renderiza o tutorial usando objetos Phaser 
    const boxWidth = this.scale.width * 0.58;
    const boxHeight = 240;
    const boxX = this.scale.width * 0.5 - boxWidth / 2;
    const boxY = this.scale.height * 0.32;

    // Fundo da caixa (fill + stroke)
    const boxBg = this.add.graphics();
    boxBg.fillStyle(0xFFFDE7, 1);
    boxBg.fillRect(boxX, boxY, boxWidth, boxHeight);
    boxBg.lineStyle(4, 0x000000, 1);
    boxBg.strokeRect(boxX, boxY, boxWidth, boxHeight);
    boxBg.setDepth(5);

    const tutorialLines = [
      '1. Observe o mapa e o vento antes de decidir o rumo.',
      '2. Acompanhe os sinais da costa para evitar correntes perigosas.',
      '3. Use o tempo certo para manobrar e preservar os suprimentos.',
      '4. Conquiste o litoral e avance em direção ao próximo desafio.'
    ];

    const tutorialText = this.add.text(boxX + 18, boxY + 14, tutorialLines.join('\n'), {
      fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
      fontSize: '18px',
      color: '#111111',
      align: 'left'
    }).setDepth(6);

    // Botão Zarpar 
    const btnWidth = boxWidth - 40;
    const btnHeight = 44;
    const btnX = boxX + (boxWidth - btnWidth) / 2;
    const btnY = boxY + boxHeight + 18;

    const btnBg = this.add.rectangle(btnX + btnWidth / 2, btnY + btnHeight / 2, btnWidth, btnHeight, 0xffeb3b)
      .setStrokeStyle(3, 0x000000)
      .setOrigin(0.5)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(btnBg.x, btnBg.y, 'Zarpar 🎮', {
      fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
      fontSize: '16px',
      color: '#000000'
    }).setOrigin(0.5).setDepth(7);

    btnBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(650, () => {
        this.scene.start('GameScene');
      });
    });
  }
}

window.TutorialScene = TutorialScene;