class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#17324b');

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x14263b).setOrigin(0);
    this.add.rectangle(0, this.scale.height * 0.72, this.scale.width, this.scale.height * 0.28, 0x2d5b4c).setOrigin(0);
    this.add.rectangle(0, this.scale.height * 0.2, this.scale.width, this.scale.height * 0.25, 0x6fa8dc).setOrigin(0);

    const sun = this.add.circle(this.scale.width * 0.83, this.scale.height * 0.18, 58, 0xffd166);
    this.add.rectangle(this.scale.width * 0.1, this.scale.height * 0.68, 340, 12, 0x4b2e1f).setOrigin(0.5, 0.5);

    const waves = this.add.graphics();
    waves.fillStyle(0xffffff, 0.12);
    waves.fillRoundedRect(this.scale.width * 0.08, this.scale.height * 0.74, this.scale.width * 0.84, 70, 18);
    waves.fillRoundedRect(this.scale.width * 0.1, this.scale.height * 0.79, this.scale.width * 0.78, 50, 16);

    this.add.text(this.scale.width * 0.5, this.scale.height * 0.18, 'Expedições Portuguesas', {
      fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#fff4b6',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(this.scale.width * 0.5, this.scale.height * 0.25, 'Entre 1501 e 1502, a nova rota se abre ao mundo.', {
      fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5);

    this.ship = this.add.container(this.scale.width * 0.28, this.scale.height * 0.72);

    const hull = this.add.rectangle(0, 8, 220, 70, 0x8b5e3c).setStrokeStyle(3, 0x000000);
    const stern = this.add.triangle(95, -2, 0, -35, 0, 35, 50, 0, 0x7a4d2b).setOrigin(0, 0.5);
    const mast = this.add.rectangle(-30, -34, 8, 95, 0x4b2e1f).setOrigin(0.5, 1);
    this.sail = this.add.rectangle(-18, -82, 95, 110, 0xffe082).setOrigin(0.5, 1).setStrokeStyle(3, 0x000000);
    const flag = this.add.triangle(-72, -100, 0, -24, 0, 24, 38, 0, 0xe64a19).setOrigin(0.5, 0.5);
    const lantern = this.add.circle(52, -2, 10, 0xffc107).setStrokeStyle(2, 0x000000);

    this.ship.add([hull, stern, mast, this.sail, flag, lantern]);
    this.add.existing(this.ship);

    this.add.rectangle(this.scale.width * 0.25, this.scale.height * 0.84, 270, 26, 0x6b3f1f).setOrigin(0.5, 0.5);
    this.add.rectangle(this.scale.width * 0.25, this.scale.height * 0.84, 250, 10, 0x8d6140).setOrigin(0.5, 0.5);

    this.tweens.add({ targets: this.ship, y: this.scale.height * 0.69, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: sun, alpha: 0.8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: waves, alpha: 0.7, duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.createMenuButtons();
  }

  createMenuButtons() {
    // O HTML injetado no Phaser usa as classes do CSS externo para manter a identidade visual "comic book".
    const html = `
      <div style="position:absolute; left:2%; top:48%; transform:translateY(-50%); display:flex; flex-direction:column; align-items:flex-start; gap:10px; z-index:8; pointer-events:auto;">
        <button id="start-btn" class="nav-btn" type="button" style="margin-bottom:2px;">Iniciar expedição</button>
        <button id="story-btn" class="nav-btn" type="button">Voltar à história anterior</button>
        <button id="home-btn" class="home-btn" type="button" style="margin-top:2px;">Home</button>
      </div>`;

    const domElement = this.add.dom(0, 0).createFromHTML(html);
    domElement.setOrigin(0, 0);
    domElement.setPosition(0, 0);

    const domNode = domElement.node;
    domNode.style.position = 'absolute';
    domNode.style.left = '0px';
    domNode.style.top = '0px';
    domNode.style.width = `${this.scale.width}px`;
    domNode.style.height = `${this.scale.height}px`;
    domNode.style.pointerEvents = 'auto';

    const startBtn = domNode.querySelector('#start-btn');
    const storyBtn = domNode.querySelector('#story-btn');
    const homeBtn = domNode.querySelector('#home-btn');

    startBtn.addEventListener('click', () => this.startExpedition());
    storyBtn.addEventListener('click', () => {
      window.location.href = 'story7.html';
    });
    homeBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  startExpedition() {
    this.tweens.add({ targets: this.ship, x: this.scale.width + 220, y: this.scale.height * 0.42, duration: 1300, ease: 'Cubic.easeInOut' });
    this.tweens.add({ targets: this.sail, scaleY: 1.18, duration: 800, ease: 'Back.easeOut' });
    this.cameras.main.fadeOut(1000, 0, 0, 0);

    this.time.delayedCall(1000, () => {
      this.scene.start('TutorialScene');
    });
  }
}

window.MenuScene = MenuScene;
