const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const elementoPontuacao = document.getElementById('scoreEl'); 
const elementoModal = document.getElementById('modalEl'); 
const elementoPontuacaoGrande = document.getElementById('bigScoreEl'); 
const elementoStatusPowerUp = document.getElementById('powerUpStatus'); 
const containerUI = document.getElementById('uiContainer');
const elementoRecorde = document.getElementById('highScoreEl');
const labelPontos = document.getElementById('labelPontos');

const sons = {
    tiro: [],
    spawn: []
};

for (let i = 0; i < 5; i++) {
    sons.tiro.push(new Audio('laser.wav'));
    sons.spawn.push(new Audio('spawn.mp3'));
}

let indiceSomTiro = 0;
let indiceSomSpawn = 0;

function tocarSomTiro() {
    sons.tiro[indiceSomTiro].currentTime = 0;
    sons.tiro[indiceSomTiro].play();
    indiceSomTiro = (indiceSomTiro + 1) % sons.tiro.length;
}

function tocarSomSpawn() {
    sons.spawn[indiceSomSpawn].volume = 0.5;
    sons.spawn[indiceSomSpawn].currentTime = 0;
    sons.spawn[indiceSomSpawn].play();
    indiceSomSpawn = (indiceSomSpawn + 1) % sons.spawn.length;
}

const menuPausa = document.createElement('div'); 
menuPausa.id = 'pauseMenu';
menuPausa.style.display = 'none';
menuPausa.innerHTML = `<div class="modal-content"><h1>Jogo Pausado</h1><button id="resumeGameBtn">Continuar</button></div>`;
document.body.appendChild(menuPausa);
const botaoContinuarJogo = document.getElementById('resumeGameBtn'); 

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const mouse = { x: canvas.width / 2, y: canvas.height / 2 };

class Jogador { 
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.raio = 15; 
        this.cor = 'hsl(204, 86%, 53%)'; 
        this.angulo = 0; 
        this.velocidade = { x: 0, y: 0 }; 
        this.aceleracao = 0.2; 
        this.velocidadeMaxima = 5; 
        this.atrito = 0.97; 
        this.powerUp = null;
        this.escudoAtivo = false; 
        this.duracaoEscudo = 5500; 
        this.timerEscudo = null; 
        this.invencivel = false;
        this.podeMover = true;
        this.contarPiscadas = 0;
    }

    desenhar() { 
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angulo);
        ctx.beginPath();
        ctx.moveTo(0, -this.raio);
        ctx.lineTo(-this.raio * 0.8, this.raio * 0.8);
        ctx.lineTo(this.raio * 0.8, this.raio * 0.8);
        ctx.closePath();

        if (this.invencivel) {
            ctx.strokeStyle = 'white';
            ctx.fillStyle = 'white';
            ctx.fill();
        } else {
            ctx.strokeStyle = this.cor;
        }

        ctx.stroke();
        ctx.restore();  


        if (this.escudoAtivo) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.raio + 5, 0, Math.PI * 2, false);
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }

    atualizar() { 

        if (!this.podeMover) {
            this.desenhar();
            return;
        }

        this.angulo = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        if (teclas.w.pressionada) this.velocidade.y -= this.aceleracao; 
        if (teclas.s.pressionada) this.velocidade.y += this.aceleracao; 
        if (teclas.a.pressionada) this.velocidade.x -= this.aceleracao; 
        if (teclas.d.pressionada) this.velocidade.x += this.aceleracao; 

        const velocidadeAtual = Math.sqrt(this.velocidade.x ** 2 + this.velocidade.y ** 2);
        if (velocidadeAtual > this.velocidadeMaxima) {
            this.velocidade.x = (this.velocidade.x / velocidadeAtual) * this.velocidadeMaxima;
            this.velocidade.y = (this.velocidade.y / velocidadeAtual) * this.velocidadeMaxima;
        }

        this.velocidade.x *= this.atrito;
        this.velocidade.y *= this.atrito;

        this.x += this.velocidade.x;
        this.y += this.velocidade.y;

        this.manterNaTela();
        this.desenhar();
    }

    manterNaTela() { 
        if (this.x - this.raio < 0) this.x = this.raio;
        if (this.x + this.raio > canvas.width) this.x = canvas.width - this.raio;
        if (this.y - this.raio < 0) this.y = this.raio;
        if (this.y + this.raio > canvas.height) this.y = canvas.height - this.raio;
    }

    ativarEscudo() { 
        this.escudoAtivo = true;
        elementoStatusPowerUp.textContent = 'Escudo Ativo!';
        elementoStatusPowerUp.style.display = 'block';
        clearTimeout(this.timerEscudo);
        this.timerEscudo = setTimeout(() => {
            this.escudoAtivo = false;
            elementoStatusPowerUp.style.display = 'none';
        }, this.duracaoEscudo);
    }
}

class Projetil {
    constructor(x, y, raio, cor, velocidade) { 
        this.x = x; this.y = y; this.raio = raio; 
        this.cor = cor; this.velocidade = velocidade; 
    }
    desenhar() { 
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.raio, 0, Math.PI * 2, false); 
        ctx.fillStyle = this.cor; ctx.fill(); 
    }
    atualizar() { 
        this.desenhar(); 
        this.x += this.velocidade.x; 
        this.y += this.velocidade.y;
    }
}

class Inimigo { 
    constructor(x, y, raio, cor, velocidade, vida = 1) { 
        this.x = x; this.y = y; this.raio = raio; 
        this.cor = cor; this.velocidade = velocidade;
        this.vida = vida; 
        this.vidaMaxima = vida; 
    }
    desenhar() { 
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.raio, 0, Math.PI * 2, false); 
        ctx.fillStyle = this.cor; 
        ctx.fill(); 
    }
    atualizar() { 
        this.desenhar(); 
        this.x += this.velocidade.x; 
        this.y += this.velocidade.y;
    }
}

class InimigoDivisor extends Inimigo { 
    constructor(x, y, raio, cor, velocidade) {
        super(x, y, raio, cor, velocidade, 2);
        this.cor = '#e74c3c';
    }
    desenhar() {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.raio);
        ctx.lineTo(this.x + this.raio, this.y + this.raio);
        ctx.lineTo(this.x - this.raio, this.y + this.raio);
        ctx.closePath();
        ctx.fillStyle = this.cor;
        ctx.fill();
    }
    dividir() {
        if (this.raio > 10) {
            for (let i = 0; i < 2; i++) {
                const angulo = Math.random() * Math.PI * 2;
                const velocidade = 2;
                const novaVelocidade = { x: Math.cos(angulo) * velocidade, y: Math.sin(angulo) * velocidade };
                inimigos.push(new Inimigo(this.x, this.y, this.raio / 2, 'hsl(204, 86%, 53%)', novaVelocidade));
            }
        }
    }
}

class InimigoKamikaze extends Inimigo { 
    constructor(x, y, raio, velocidade) {
        super(x, y, raio, '#9b59b6', velocidade, 1);
        const velocidadeAtaque = 4;
        const angulo = Math.atan2(jogador.y - this.y, jogador.x - this.x);
        this.velocidade = { x: Math.cos(angulo) * velocidadeAtaque, y: Math.sin(angulo) * velocidadeAtaque };
    }
    desenhar() {
        ctx.fillStyle = this.cor;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.raio);
        ctx.lineTo(this.x + this.raio, this.y);
        ctx.lineTo(this.x, this.y + this.raio);
        ctx.lineTo(this.x - this.raio, this.y);
        ctx.closePath();
        ctx.fill();
    }
}

class PowerUp {
    constructor(x, y, velocidade, tipo) {
        this.x = x; this.y = y; this.velocidade = velocidade;
        this.raio = 8;
        this.tipo = tipo;
        this.cor = this.obterCor(); 
    }
    obterCor() { 
        switch(this.tipo) {
            case 'TiroTriplo': return '#2ecc71';
            case 'Escudo': return '#3498db';
            case 'Congelar': return '#3498db';
            default: return 'white';
        }
    }
    obterIcone() { 
        switch(this.tipo) {
            case 'TiroTriplo': return '3X';
            case 'Escudo': return 'S';
            case 'Congelar': return 'F';
            default: return '';
        }
    }
    desenhar() { 
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.raio, 0, Math.PI * 2, false);
        ctx.fillStyle = this.cor;
        ctx.fill();
        ctx.font = '10px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.obterIcone(), this.x, this.y); 
    }
    atualizar() { 
        this.desenhar();
        this.x += this.velocidade.x;
        this.y += this.velocidade.y;
    }
}

const atrito = 0.99; 
class Particula { 
    constructor(x, y, raio, cor, velocidade) { 
        this.x = x; this.y = y; this.raio = raio; this.cor = cor; 
        this.velocidade = velocidade; this.alpha = 1; 
    }
    desenhar() { 
        ctx.save(); 
        ctx.globalAlpha = this.alpha; 
        ctx.beginPath(); ctx.arc(this.x, this.y, this.raio, 0, Math.PI * 2, false); 
        ctx.fillStyle = this.cor; ctx.fill(); ctx.restore(); 
    }
    atualizar() { 
        this.desenhar(); 
        this.velocidade.x *= atrito; 
        this.velocidade.y *= atrito; 
        this.x += this.velocidade.x; 
        this.y += this.velocidade.y; 
        this.alpha -= 0.01; 
    }
}

class ProjetilInimigo { 
    constructor(x, y, velocidade) { 
        this.x = x; this.y = y; 
        this.raio = 4; this.cor = '#e74c3c'; 
        this.velocidade = velocidade;
    }
    desenhar() { 
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.raio, 0, Math.PI * 2, false); 
        ctx.fillStyle = this.cor; ctx.fill(); 
    }
    atualizar() { 
        this.desenhar(); 
        this.x += this.velocidade.x; 
        this.y += this.velocidade.y; 
    }
}

class InimigoAtirador extends Inimigo { 
    constructor(x, y, velocidade) { 
        super(x, y, 12, '#e74c3c', velocidade, 1);
        this.tempoRecargaTiro = Math.random() * 100 + 50; 
    }
    desenhar() { 
        ctx.fillStyle = this.cor; 
        ctx.fillRect(this.x - this.raio, this.y - this.raio, this.raio * 2, this.raio * 2); 
    }
    atirar() { 
        const angulo = Math.atan2(jogador.y - this.y, jogador.x - this.x); 
        const velocidade = 4; 
        projeteisInimigos.push(new ProjetilInimigo(this.x, this.y, { x: Math.cos(angulo) * velocidade, y: Math.sin(angulo) * velocidade })); 
    }
    atualizar() { 
        super.atualizar(); 
        this.tempoRecargaTiro--; 
        if (this.tempoRecargaTiro <= 0 && !jogoPausado) { 
            this.atirar(); 
            this.tempoRecargaTiro = 90; 
        } 
    }
}

class Asteroide { 
    constructor(x, y, raio, velocidade) {
        this.x = x; this.y = y; this.velocidade = velocidade; this.raio = raio;
        this.cor = '#7f8c8d'; this.pontosForma = []; 
        const numVertices = Math.floor(Math.random() * 5 + 10);
        for (let i = 0; i < numVertices; i++) {
            const angulo = (i / numVertices) * Math.PI * 2;
            const raioAleatorio = this.raio * (Math.random() * 0.4 + 0.8);
            this.pontosForma.push({ x: Math.cos(angulo) * raioAleatorio, y: Math.sin(angulo) * raioAleatorio });
        }
    }
    desenhar() {
        ctx.beginPath();
        ctx.moveTo(this.x + this.pontosForma[0].x, this.y + this.pontosForma[0].y);
        for (let i = 1; i < this.pontosForma.length; i++) {
            ctx.lineTo(this.x + this.pontosForma[i].x, this.y + this.pontosForma[i].y);
        }
        ctx.closePath(); ctx.strokeStyle = this.cor; ctx.lineWidth = 2; ctx.stroke();
    }
    atualizar() {
        this.desenhar();
        this.x += this.velocidade.x;
        this.y += this.velocidade.y;

        if (Math.random() < 0.5) {
            const raioParticula = Math.random() * 3 + 1;
            const corParticula = `hsl(${Math.random() * 60}, 100%, 50%)`; 
            const velocidadeParticula = {
                x: (Math.random() - 0.5) * 0.8 - this.velocidade.x * 0.2,
                y: (Math.random() - 0.5) * 0.8 - this.velocidade.y * 0.2
            };
            particulas.push(new Particula(this.x, this.y, raioParticula, corParticula, velocidadeParticula));
        }
    }


}

let jogador, projeteis, inimigos, particulas, asteroides, powerUps, projeteisInimigos; 
let pontuacao, idAnimacao, recorde; 
let moedas, moedasColetadas;
let nivelDificuldade, taxaGerarInimigos, taxaGerarAsteroides; 
let idIntervaloGerarInimigos, idIntervaloGerarAsteroides, idIntervaloGerarPowerUp; 
let jogoPausado = false; 
let jogoAtivo = false;

const teclas = { 
    w: { pressionada: false }, a: { pressionada: false }, 
    s: { pressionada: false }, d: { pressionada: false },
};

function gerarObjetos() { 
    clearInterval(idIntervaloGerarInimigos); 
    clearInterval(idIntervaloGerarAsteroides);
    clearInterval(idIntervaloGerarPowerUp);

    function gerarInimigo() {
        if (!jogoAtivo || jogoPausado) return;
        const raio = Math.random() * (30 - 8) + 8; 
        let x, y;
        if (Math.random() < 0.5) { x = Math.random() < 0.5 ? 0 - raio : canvas.width + raio; 
            y = Math.random() * canvas.height; } else { x = Math.random() * canvas.width; 
            y = Math.random() < 0.5 ? 0 - raio : canvas.height + raio; 
        }
        const angulo = Math.atan2(jogador.y - y, jogador.x - x); 
        
        const fatorVelocidade = 1 + (nivelDificuldade * 0.2);
        const velocidade = { x: Math.cos(angulo) * fatorVelocidade, y: Math.sin(angulo) * fatorVelocidade };
        
        const tipoInimigo = Math.random();
         if (tipoInimigo < 0.35) {
            inimigos.push(new InimigoKamikaze(x, y, 10, velocidade));
        } else if (tipoInimigo < 0.5) {
            inimigos.push(new InimigoDivisor(x, y, 15, 'red', velocidade));
        } else if (tipoInimigo < 0.7) {
            inimigos.push(new InimigoAtirador(x, y, velocidade));
        } else {
            inimigos.push(new Inimigo(x, y, raio, `hsl(${Math.random() * 360}, 50%, 50%)`, velocidade));
        }
    }
    idIntervaloGerarInimigos = setInterval(gerarInimigo, taxaGerarInimigos);

    idIntervaloGerarAsteroides = setInterval(() => {
        if (!jogoAtivo || jogoPausado) return;
        const raio = Math.random() * (50 - 20) + 20; 
        let x, y;
        if (Math.random() < 0.5) { 
            x = Math.random() < 0.5 ? 0 - raio : canvas.width + raio; 
            y = Math.random() * canvas.height; } else { x = Math.random() * canvas.width; y = Math.random() < 0.5 ? 0 - raio : canvas.height + raio; 
        }
        const angulo = Math.atan2(jogador.y - y, jogador.x - x);
        
        const fatorVelocidadeAsteroide = 0.8 + (nivelDificuldade * 0.15);

        const velocidade = { 
            x: Math.cos(angulo) * fatorVelocidadeAsteroide, 
            y: Math.sin(angulo) * fatorVelocidadeAsteroide 
        };
        asteroides.push(new Asteroide(x, y, raio, velocidade));
    }, taxaGerarAsteroides);

    idIntervaloGerarPowerUp = setInterval(() => {
        if (!jogoAtivo || jogoPausado) return;
        if (Math.random() > 0.5) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const velocidade = { x: (Math.random() - 0.5), y: (Math.random() - 0.5) };
            const tiposPowerUp = ['TiroTriplo', 'TiroTriplo', 'TiroTriplo', 'Escudo', 'Congelar'];
            const tipoAleatorio = tiposPowerUp[Math.floor(Math.random() * tiposPowerUp.length)];
            powerUps.push(new PowerUp(x, y, velocidade, tipoAleatorio));
        }
    }, 15000);
}

function iniciar() {
    jogador = new Jogador(canvas.width / 2, canvas.height / 2);
    
    jogador.podeMover = false;
    let piscadasRestantes = 3;

    const intervaloPiscadas = setInterval(() => {
        if (piscadasRestantes > 0) {
            tocarSomSpawn(); 

            jogador.invencivel = true;

            setTimeout(() => {
                if (jogador) {
                    jogador.invencivel = false;
                }
            }, 150);

            piscadasRestantes--;

        } else {
            clearInterval(intervaloPiscadas);

            if (jogador) {
                jogador.podeMover = true;
            }
        }
    }, 400);

    projeteis = [];
    inimigos = [];
    particulas = [];
    asteroides = [];
    powerUps = [];
    moedas = [];
    projeteisInimigos = [];
    pontuacao = 0;
    elementoPontuacao.innerHTML = pontuacao;

    elementoModal.style.display = 'none';

    jogoAtivo = true;

    nivelDificuldade = 1;
    taxaGerarInimigos = 1800;
    taxaGerarAsteroides = 5000;

    gerarObjetos();


    for (const tecla in teclas) {
        teclas[tecla].pressionada = false;
    }

    if (idAnimacao === undefined || idAnimacao === null) {
        animar();
    }
}

function atualizarDificuldade() { 
    nivelDificuldade++;
    taxaGerarInimigos = Math.max(250, 1800 - nivelDificuldade * 150);
    taxaGerarAsteroides = Math.max(2000, 5000 - nivelDificuldade * 200);
    gerarObjetos();
}

function alternarPausa() { 
    jogoPausado = !jogoPausado;

    if (jogoPausado) {
        cancelAnimationFrame(idAnimacao);
        menuPausa.style.display = 'flex';
    } else {
        idAnimacao = requestAnimationFrame(animar);
        menuPausa.style.display = 'none';
    }
}


function animar() { 
    if (jogoPausado) return;

    idAnimacao = requestAnimationFrame(animar);
    ctx.fillStyle = 'rgba(0, 0, 10, 0.2)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (pontuacao > nivelDificuldade * 500) { 
        atualizarDificuldade(); 
    }

    jogador.atualizar();
    
    particulas.forEach((p, i) => { 
        if (p.alpha <= 0 || p.raio <= 0) particulas.splice(i, 1); 
        else p.atualizar(); 
    });
    
    projeteis.forEach((p, i) => { 
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) projeteis.splice(i, 1); 
        else p.atualizar(); 
    });
    
    projeteisInimigos.forEach((pi, i) => { 
        pi.atualizar(); 
        if (Math.hypot(jogador.x - pi.x, jogador.y - pi.y) - jogador.raio - pi.raio < 1) { 
            if (!jogador.escudoAtivo) { finalizarJogo(); }
            projeteisInimigos.splice(i, 1);
        }
    });

    powerUps.forEach((p, i) => { 
        p.atualizar(); 
        if (Math.hypot(jogador.x - p.x, jogador.y - p.y) - jogador.raio - p.raio < 1) { 
            ativarPowerUp(p.tipo);
            powerUps.splice(i, 1); 
        } 
    });

    moedas.forEach((moeda, index) => {
        moeda.atualizar();
        const dist = Math.hypot(jogador.x - moeda.x, jogador.y - moeda.y);

        if (dist - jogador.raio - moeda.raio < 1) {
            moedasColetadas++;

            moedas.splice(index, 1);
        }
    })

    for (let indiceInimigo = inimigos.length - 1; indiceInimigo >= 0; indiceInimigo--) {
        const inimigo = inimigos[indiceInimigo];
        if (!inimigo) continue;

        if (
            (inimigo.x + inimigo.raio < 0 ||
            inimigo.x - inimigo.raio > canvas.width ||
            inimigo.y + inimigo.raio < 0 ||
            inimigo.y - inimigo.raio > canvas.height)
        ) {
            inimigos.splice(indiceInimigo, 1);
            continue;
        }

        inimigo.atualizar();

        if (Math.hypot(jogador.x - inimigo.x, jogador.y - inimigo.y) - jogador.raio - inimigo.raio < 1) {
            if (!jogador.escudoAtivo) {
                finalizarJogo();
            } else {
                inimigos.splice(indiceInimigo, 1);
                continue;
            }
        }

        for (let projIndex = projeteis.length - 1; projIndex >= 0; projIndex--) {
            const proj = projeteis[projIndex];
            if (!inimigos[indiceInimigo]) break;
            
            const dist = Math.hypot(proj.x - inimigo.x, proj.y - inimigo.y);
            if (dist - inimigo.raio - proj.raio < 1) {
                for (let i = 0; i < inimigo.raio * 2; i++) {
                    particulas.push(new Particula(proj.x, proj.y, Math.random() * 2, inimigo.cor, {
                        x: (Math.random() - 0.5) * (Math.random() * 6),
                        y: (Math.random() - 0.5) * (Math.random() * 6)
                    }));
                }
                
                inimigo.vida--;
                projeteis.splice(projIndex, 1);

                if (inimigo.vida <= 0) {
                    let pontos = 100;
                    if (inimigo instanceof InimigoAtirador) pontos = 150;
                    if (inimigo instanceof InimigoDivisor) pontos = 200;
                    if (inimigo instanceof InimigoKamikaze) pontos = 100;
                    pontuacao += pontos;
                    
                    if (inimigo instanceof InimigoDivisor) inimigo.dividir();

                    if (Math.random() < 0.05) {
                        moedas.push(new Moeda(inimigo.x, inimigo.y));
                    }

                    inimigos.splice(indiceInimigo, 1);
                }
                
                elementoPontuacao.textContent = pontuacao;
            }
        }
    }

    for (let astIndex = asteroides.length - 1; astIndex >= 0; astIndex--) {
        const asteroide = asteroides[astIndex];

        asteroide.atualizar();

        if (Math.hypot(jogador.x - asteroide.x, jogador.y - asteroide.y) - jogador.raio - asteroide.raio < 1) { 
            if (!jogador.escudoAtivo) { 
                finalizarJogo(); 
            } else { 
                asteroides.splice(astIndex, 1); 
                continue;
            }
        }

        for (let projIndex = projeteis.length - 1; projIndex >= 0; projIndex--) {
            const proj = projeteis[projIndex];
            if (!asteroides[astIndex]) break; 

            if (Math.hypot(proj.x - asteroide.x, proj.y - asteroide.y) - asteroide.raio - proj.raio < 1) {
                for (let i = 0; i < asteroide.raio * 2; i++) { 
                    particulas.push(new Particula(proj.x, proj.y, Math.random() * 2, asteroide.cor, { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 })); 
                }
                
                projeteis.splice(projIndex, 1);
            }
        }
    }
}


function finalizarJogo() {
    for (let i = 0; i < jogador.raio * 2; i++) {
        particulas.push(new Particula(jogador.x, jogador.y, Math.random() * 2, jogador.cor, {
            x: (Math.random() - 0.5) * (Math.random() * 8),
            y: (Math.random() - 0.5) * (Math.random() * 8)
        }));
    }

    jogador.raio = 0;

    setTimeout(() => {
        jogoAtivo = false;
        cancelAnimationFrame(idAnimacao);
        idAnimacao = null;
        clearInterval(idIntervaloGerarInimigos);
        clearInterval(idIntervaloGerarAsteroides);
        clearInterval(idIntervaloGerarPowerUp);

        const totalMoedas = parseInt(localStorage.getItem('spaceBattleCoins')) || 0;
        localStorage.setItem('spaceBattleCoins', totalMoedas + moedasColetadas);

        if (pontuacao > recorde) {
            recorde = pontuacao;
            localStorage.setItem('spaceBattleHighScore', recorde);
            elementoRecorde.textContent = `Novo Recorde: ${recorde}`;
        }

        elementoModal.style.display = 'flex';
        elementoPontuacaoGrande.textContent = pontuacao;
        labelPontos.style.display = 'block';
        elementoPontuacaoGrande.style.display = 'block';

        const botaoReiniciarJogo = document.getElementById('restartGameBtn');
        botaoReiniciarJogo.addEventListener('click', () => {
            iniciar();
        }, { once: true }); 

    }, 500);
}

function ativarPowerUp(tipo) {
    elementoStatusPowerUp.style.display = 'block';
    let duracao = 7000;
    switch(tipo) {
        case 'TiroTriplo':
            jogador.powerUp = 'TiroTriplo';
            elementoStatusPowerUp.textContent = 'Tiro Triplo Ativo!';
            setTimeout(() => { jogador.powerUp = null; elementoStatusPowerUp.style.display = 'none'; }, duracao);
            break;
        case 'Escudo':
            jogador.ativarEscudo();
            break;
        case 'Congelar':
            elementoStatusPowerUp.textContent = 'Inimigos Congelados!';
            const velocidadesOriginais = inimigos.map(e => ({ ...e.velocidade }));
            inimigos.forEach(e => { e.velocidade = { x: 0, y: 0 }; });
            setTimeout(() => {
                inimigos.forEach((e, i) => {
                    if (velocidadesOriginais[i]) { e.velocidade = velocidadesOriginais[i]; }
                });
                elementoStatusPowerUp.style.display = 'none';
            }, 3000);
            break;
    }
}

window.addEventListener('mousemove', (event) => { mouse.x = event.clientX; mouse.y = event.clientY; });

window.addEventListener('click', () => {
    if (jogoPausado || !jogador.podeMover) return;
    tocarSomTiro();
    const velocidade = 7;
    const velocidadeProjetil = { x: Math.cos(jogador.angulo) * velocidade, y: Math.sin(jogador.angulo) * velocidade };

    if (jogador.powerUp === 'TiroTriplo') {
        for (let i = -1; i <= 1; i++) {
            const anguloDeslocado = 0.2 * i;
            projeteis.push(new Projetil(jogador.x, jogador.y, 5, '#f1c40f',
                { x: Math.cos(jogador.angulo + anguloDeslocado) * velocidade, y: Math.sin(jogador.angulo + anguloDeslocado) * velocidade }));
        }
    } else {
        projeteis.push(new Projetil(jogador.x, jogador.y, 5, 'white', velocidadeProjetil));
    }
});

window.addEventListener('keydown', (event) => { 
    const tecla = event.key.toLowerCase(); 
    if (tecla in teclas) { teclas[tecla].pressionada = true; } 
    if (tecla === 'p' || event.key === 'Escape') {
        alternarPausa();
    }
});

window.addEventListener('keyup', (event) => { const tecla = event.key.toLowerCase(); if (tecla in teclas) { teclas[tecla].pressionada = false; } });

botaoContinuarJogo.addEventListener('click', alternarPausa);
window.addEventListener('resize', () => { canvas.width = innerWidth; canvas.height = innerHeight; iniciar(); });

elementoPontuacaoGrande.style.display = 'none';
labelPontos.style.display = 'none';


iniciar();
