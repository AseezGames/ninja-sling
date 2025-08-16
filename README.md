# 🥷 Ninja Sling Game

A physics-based slingshot game built with Next.js where you launch a ninja ball upward through challenging platforms to achieve the highest score possible!

## 🎮 Game Features

- **Physics-Based Gameplay**: Realistic ball physics with gravity, air resistance, and momentum
- **Dynamic Platform Generation**: Endless upward progression with varied platform types
- **Multiple Platform Types**:
  - 🟢 **Static Platforms**: Safe landing spots
  - 🔵 **Moving Platforms**: Oscillating challenges that move up and down
  - 🔴 **Deadly Obstacles**: Avoid these or restart the game!
- **Carrom-Style Bouncing**: Realistic collision physics when hitting platforms from different angles
- **Boundary Walls**: Ball bounces off left and right edges like a real game arena
- **Score System**: Earn points based on platform height - higher platforms = more points!
- **High Score Tracking**: Your best score is saved locally
- **Visual Effects**: Particle effects, floating score text, and smooth animations
- **Audio Feedback**: Sound effects for collisions, landings, and game events
- **Responsive Design**: Works on desktop and mobile devices

## 🎯 How to Play

1. **Aim**: Click and drag from the ninja ball to aim your shot
2. **Launch**: Release to sling the ball upward toward platforms
3. **Score**: Land on platforms to earn points - higher platforms give more points!
4. **Avoid**: Stay away from red deadly obstacles
5. **Bounce**: Use wall bounces and platform physics to reach higher levels
6. **Repeat**: Keep slinging upward to beat your high score!

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed on your system
- npm, yarn, pnpm, or bun package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ninja-sling.git
cd ninja-sling
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to play!

## 🛠️ Built With

- **Next.js 14** - React framework for production
- **React 18** - UI library
- **HTML5 Canvas** - Game rendering and physics
- **CSS Modules** - Styling
- **Web Audio API** - Sound effects
- **LocalStorage** - High score persistence

## 📱 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy automatically with zero configuration!

Or use the Vercel CLI:
```bash
npx vercel
```

### Other Platforms

This Next.js app can be deployed to any platform that supports Node.js:
- Netlify
- Railway
- Render
- AWS Amplify
- And more!

## 🎮 Game Controls

- **Mouse**: Click and drag from ball to aim and launch
- **Touch**: Tap and drag on mobile devices
- **Physics**: Ball responds to gravity, bounces, and momentum

## 🏆 Scoring System

- Points are awarded based on platform height
- Higher platforms = more points
- Bonus points for reaching new heights
- High score is automatically saved

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Future Features

- [ ] Power-ups and special abilities
- [ ] Multiple ball types
- [ ] Leaderboards
- [ ] Achievement system
- [ ] Custom themes
- [ ] Multiplayer mode

---

**Enjoy the game and try to beat your high score! 🥷🎯**