export class ParticleSystem {
  constructor() {
    this.particles = [];
  }
  
  addParticle(x, y, color = '#fff') {
    this.particles.push({
      x, y,
      velocityX: (Math.random() - 0.5) * 10,
      velocityY: Math.random() * -5,
      life: 30,
      color
    });
  }
  
  update() {
    this.particles = this.particles.filter(particle => {
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
      particle.velocityY += 0.3; // gravity
      particle.life--;
      return particle.life > 0;
    });
  }
  
  render(ctx) {
    this.particles.forEach(particle => {
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life / 30;
      ctx.fillRect(particle.x, particle.y, 3, 3);
      ctx.globalAlpha = 1;
    });
  }
}