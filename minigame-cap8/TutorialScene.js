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

    const html = `
      <div style="position:absolute; left:5%; bottom:5%; width:min(72%, 770px); display:flex; flex-direction:column; gap:14px; pointer-events:auto;">
        <div class="narrative-box" style="position:relative; width:100%; min-height:240px;">
          <div class="tag-contexto">Tutorial</div>
          <div class="text-scroll">
            <p class="narrative-text">
              1. Observe o mapa e o vento antes de decidir o rumo.<br>
              2. Acompanhe os sinais da costa para evitar correntes perigosas.<br>
              3. Use o tempo certo para manobrar e preservar os suprimentos.<br>
              4. Conquiste o litoral e avance em direção ao próximo desafio.
            </p>
          </div>
        </div>
        <button id="play-btn" class="nav-btn" type="button">Zarpar 🎮</button>
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

    const playButton = domNode.querySelector('#play-btn');
    playButton.addEventListener('click', () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(650, () => {
        this.scene.start('GameScene');
      });
    });
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#111111');
    this.add.text(this.scale.width * 0.5, this.scale.height * 0.5, 'Cena principal em integração', {
      fontFamily: 'Comic Sans MS, Chalkboard SE, sans-serif',
      fontSize: '34px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);
  }
}

window.TutorialScene = TutorialScene;
window.GameScene = GameScene;
