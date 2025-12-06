import React, { useEffect, useRef } from 'react';

const AnimationModal = ({ type, onClose }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (type === 'promoted') {
            // 烟花动画
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const fireworks = [];
            const particles = [];

            class Firework {
                constructor(x, y) {
                    this.x = x;
                    this.y = canvas.height;
                    this.targetY = y;
                    this.speed = 5;
                    this.exploded = false;
                    this.hue = Math.random() * 360;
                }

                update() {
                    if (!this.exploded) {
                        this.y -= this.speed;
                        if (this.y <= this.targetY) {
                            this.exploded = true;
                            this.createParticles();
                        }
                    }
                }

                createParticles() {
                    const particleCount = 100;
                    for (let i = 0; i < particleCount; i++) {
                        particles.push(new Particle(this.x, this.y, this.hue));
                    }
                }

                draw() {
                    if (!this.exploded) {
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                        ctx.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
                        ctx.fill();
                    }
                }
            }

            class Particle {
                constructor(x, y, hue) {
                    this.x = x;
                    this.y = y;
                    this.hue = hue + Math.random() * 50 - 25;
                    this.speed = Math.random() * 5 + 2;
                    this.angle = (Math.random() * Math.PI * 2);
                    this.velocityX = Math.cos(this.angle) * this.speed;
                    this.velocityY = Math.sin(this.angle) * this.speed;
                    this.alpha = 1;
                    this.decay = Math.random() * 0.02 + 0.01;
                    this.gravity = 0.05;
                }

                update() {
                    this.velocityY += this.gravity;
                    this.x += this.velocityX;
                    this.y += this.velocityY;
                    this.alpha -= this.decay;
                }

                draw() {
                    ctx.save();
                    ctx.globalAlpha = this.alpha;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
                    ctx.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
                    ctx.fill();
                    ctx.restore();
                }
            }

            let animationId;
            let frameCount = 0;

            const animate = () => {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 每30帧创建一个新烟花
                if (frameCount % 30 === 0 && fireworks.length < 5) {
                    const x = Math.random() * canvas.width;
                    const y = Math.random() * canvas.height / 2;
                    fireworks.push(new Firework(x, y));
                }

                fireworks.forEach((fw, index) => {
                    fw.update();
                    fw.draw();
                    if (fw.exploded) {
                        fireworks.splice(index, 1);
                    }
                });

                particles.forEach((p, index) => {
                    p.update();
                    p.draw();
                    if (p.alpha <= 0) {
                        particles.splice(index, 1);
                    }
                });

                frameCount++;
                animationId = requestAnimationFrame(animate);
            };

            animate();

            // 3.5秒后自动关闭
            const timer = setTimeout(() => {
                cancelAnimationFrame(animationId);
                onClose();
            }, 3500);

            return () => {
                cancelAnimationFrame(animationId);
                clearTimeout(timer);
            };
        } else {
            // 其他动效自动关闭
            const timer = setTimeout(onClose, 2000);
            return () => clearTimeout(timer);
        }
    }, [type, onClose]);

    if (!type) return null;

    // 淘汰动效
    if (type === 'drop') {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-white rounded-2xl p-12 shadow-2xl animate-scale-in">
                    <div className="text-6xl mb-4 text-center">💪</div>
                    <div className="text-3xl font-bold text-gray-800 text-center">
                        再接再厉
                    </div>
                    <div className="text-lg text-gray-500 mt-4 text-center">
                        每次尝试都是成长
                    </div>
                </div>
            </div>
        );
    }

    // 继续测动效
    if (type === 'retry') {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-12 shadow-2xl animate-pulse-scale">
                    <div className="text-6xl mb-4 text-center">🔥</div>
                    <div className="text-4xl font-bold text-white text-center">
                        坚持就是胜利！
                    </div>
                    <div className="text-xl text-blue-100 mt-4 text-center">
                        继续努力，成功在望
                    </div>
                </div>
            </div>
        );
    }

    // 转长期烟花动效
    if (type === 'promoted') {
        return (
            <div className="fixed inset-0 bg-black z-50">
                <canvas ref={canvasRef} className="absolute inset-0" />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="animate-bounce-in">
                        <div className="text-7xl mb-6 animate-spin-slow">🎉</div>
                        <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 text-center animate-shimmer">
                            恭喜你！
                        </div>
                        <div className="text-3xl font-bold text-white mt-4 text-center animate-pulse">
                            爆单就在前方！
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default AnimationModal;
