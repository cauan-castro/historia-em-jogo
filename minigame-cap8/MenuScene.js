class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  preload() {
    // carrega a imagem de fundo da cena do menu
    this.load.image('menuBg', '../assets/cenas/cena-menu-cap8.jpeg');
    // carrega imagem da caravela que ficará no canto inferior direito
    this.load.image('caravela', '../assets/sprites/caravela.jpeg');
  }

  create() {
    this.cameras.main.setBackgroundColor('#17324b');

    // adiciona imagem de fundo e redimensiona para cobrir toda a tela
    const bg = this.add.image(0, 0, 'menuBg').setOrigin(0);
    bg.setDisplaySize(this.scale.width, this.scale.height);
    // garante que o background fique atrás de todos os elementos da cena
    bg.setDepth(-1);

    // adiciona uma caravela centralizada na parte inferior
    this.caravela = this.add.image(this.scale.width * 0.5, this.scale.height + 14, 'caravela').setOrigin(0.5, 1);
    this.caravela.setDisplaySize(198, 99);
    // garantir que fique acima do background
    this.caravela.setDepth(0);

    // animação de flutuar enquanto o jogador não clica
    this.caravelaTween = this.tweens.add({
      targets: this.caravela,
      y: this.caravela.y - 10,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

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
      window.location.href = '../historia-cap7/story7.html';
    });
    homeBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  startExpedition() {
    // parar a animação de flutuar da caravela e fazê-la deslizar para a direita
    if (this.caravelaTween && this.caravelaTween.stop) this.caravelaTween.stop();
    if (this.caravela) {
      this.tweens.add({
        targets: this.caravela,
        x: this.scale.width + this.caravela.displayWidth + 120,
        duration: 900,
        ease: 'Cubic.easeInOut'
      });
    }

    // fade e transição de cena sincronizados com o movimento
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.time.delayedCall(900, () => {
      this.scene.start('TutorialScene');
    });
  }
}

window.MenuScene = MenuScene;
