class ScrollStack {
    constructor(selector, options = {}) {
        this.scroller = typeof selector === 'string' ? document.querySelector(selector) : selector;
        
        if (!this.scroller) {
            console.error('ScrollStack: Scroller element not found');
            return;
        }

        // Default options optimized for feature showcase
        this.options = {
            itemDistance: 120,
            itemScale: 0.04,
            itemStackDistance: 35,
            stackPosition: '25%',
            scaleEndPosition: '15%',
            baseScale: 0.88,
            scaleDuration: 0.6,
            rotationAmount: 2,
            blurAmount: 1.5,
            useWindowScroll: false,
            onStackComplete: null,
            onCardFocus: null,
            enableParallax: true,
            enableHoverEffects: true,
            ...options
        };

        // State
        this.cards = [];
        this.lastTransforms = new Map();
        this.isUpdating = false;
        this.stackCompleted = false;
        this.animationFrame = null;
        this.lenis = null;
        this.currentFocusedCard = -1;

        this.init();
    }

    init() {
        this.cards = Array.from(
            this.options.useWindowScroll
                ? document.querySelectorAll('.scroll-stack-card')
                : this.scroller.querySelectorAll('.scroll-stack-card')
        );

        this.setupCards();
        this.setupLenis();
        this.updateCardTransforms();
    }

    setupCards() {
        this.cards.forEach((card, i) => {
            if (i < this.cards.length - 1) {
                card.style.marginBottom = `${this.options.itemDistance}px`;
            }
            card.style.willChange = 'transform, filter';
            card.style.transformOrigin = 'top center';
            card.style.backfaceVisibility = 'hidden';
            card.style.transform = 'translateZ(0)';
            card.style.webkitTransform = 'translateZ(0)';
            card.style.perspective = '1000px';
            card.style.webkitPerspective = '1000px';

            // Add interaction events for feature cards
            if (this.options.enableHoverEffects) {
                card.addEventListener('mouseenter', (e) => this.handleCardHover(e, i, true));
                card.addEventListener('mouseleave', (e) => this.handleCardHover(e, i, false));
            }

            // Add data attributes for analytics
            card.setAttribute('data-card-index', i);
        });
    }

    handleCardHover(event, index, isEntering) {
        const card = event.currentTarget;
        
        if (isEntering) {
            card.style.transition = 'box-shadow 0.3s ease, transform 0.3s ease';
            card.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)';
            
            // Optional callback for card focus events
            if (this.options.onCardFocus && this.currentFocusedCard !== index) {
                this.currentFocusedCard = index;
                this.options.onCardFocus(index, card);
            }
        } else {
            card.style.transition = 'box-shadow 0.3s ease, transform 0.3s ease';
            setTimeout(() => {
                if (card.matches(':not(:hover)')) {
                    card.style.boxShadow = '';
                }
            }, 100);
        }
    }

    setupLenis() {
        if (this.options.useWindowScroll) {
            this.lenis = new Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                touchMultiplier: 2,
                infinite: false,
                wheelMultiplier: 1,
                lerp: 0.1,
                syncTouch: true,
                syncTouchLerp: 0.075
            });
        } else {
            this.lenis = new Lenis({
                wrapper: this.scroller,
                content: this.scroller.querySelector('.scroll-stack-inner'),
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                touchMultiplier: 2,
                infinite: false,
                gestureOrientationHandler: true,
                normalizeWheel: true,
                wheelMultiplier: 1,
                touchInertiaMultiplier: 35,
                lerp: 0.1,
                syncTouch: true,
                syncTouchLerp: 0.075,
                touchInertia: 0.6
            });
        }

        this.lenis.on('scroll', () => this.handleScroll());
        this.raf();
    }

    raf(time) {
        this.lenis.raf(time);
        this.animationFrame = requestAnimationFrame((time) => this.raf(time));
    }

    calculateProgress(scrollTop, start, end) {
        if (scrollTop < start) return 0;
        if (scrollTop > end) return 1;
        return (scrollTop - start) / (end - start);
    }

    parsePercentage(value, containerHeight) {
        if (typeof value === 'string' && value.includes('%')) {
            return (parseFloat(value) / 100) * containerHeight;
        }
        return parseFloat(value);
    }

    getScrollData() {
        if (this.options.useWindowScroll) {
            return {
                scrollTop: window.scrollY,
                containerHeight: window.innerHeight,
                scrollContainer: document.documentElement
            };
        } else {
            return {
                scrollTop: this.scroller.scrollTop,
                containerHeight: this.scroller.clientHeight,
                scrollContainer: this.scroller
            };
        }
    }

    getElementOffset(element) {
        if (this.options.useWindowScroll) {
            const rect = element.getBoundingClientRect();
            return rect.top + window.scrollY;
        } else {
            return element.offsetTop;
        }
    }

    handleScroll() {
        this.updateCardTransforms();
    }

    updateCardTransforms() {
        if (!this.cards.length || this.isUpdating) return;

        this.isUpdating = true;

        const { scrollTop, containerHeight } = this.getScrollData();
        const stackPositionPx = this.parsePercentage(this.options.stackPosition, containerHeight);
        const scaleEndPositionPx = this.parsePercentage(this.options.scaleEndPosition, containerHeight);

        const endElement = this.options.useWindowScroll
            ? document.querySelector('.scroll-stack-end')
            : this.scroller.querySelector('.scroll-stack-end');

        const endElementTop = endElement ? this.getElementOffset(endElement) : 0;

        this.cards.forEach((card, i) => {
            if (!card) return;

            const cardTop = this.getElementOffset(card);
            const triggerStart = cardTop - stackPositionPx - this.options.itemStackDistance * i;
            const triggerEnd = cardTop - scaleEndPositionPx;
            const pinStart = cardTop - stackPositionPx - this.options.itemStackDistance * i;
            const pinEnd = endElementTop - containerHeight / 2;

            const scaleProgress = this.calculateProgress(scrollTop, triggerStart, triggerEnd);
            const targetScale = this.options.baseScale + i * this.options.itemScale;
            const scale = 1 - scaleProgress * (1 - targetScale);
            const rotation = this.options.rotationAmount ? i * this.options.rotationAmount * scaleProgress : 0;

            let blur = 0;
            if (this.options.blurAmount) {
                let topCardIndex = 0;
                for (let j = 0; j < this.cards.length; j++) {
                    const jCardTop = this.getElementOffset(this.cards[j]);
                    const jTriggerStart = jCardTop - stackPositionPx - this.options.itemStackDistance * j;
                    if (scrollTop >= jTriggerStart) {
                        topCardIndex = j;
                    }
                }

                if (i < topCardIndex) {
                    const depthInStack = topCardIndex - i;
                    blur = Math.max(0, depthInStack * this.options.blurAmount);
                }
            }

            let translateY = 0;
            const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

            if (isPinned) {
                translateY = scrollTop - cardTop + stackPositionPx + this.options.itemStackDistance * i;
            } else if (scrollTop > pinEnd) {
                translateY = pinEnd - cardTop + stackPositionPx + this.options.itemStackDistance * i;
            }

            const newTransform = {
                translateY: Math.round(translateY * 100) / 100,
                scale: Math.round(scale * 1000) / 1000,
                rotation: Math.round(rotation * 100) / 100,
                blur: Math.round(blur * 100) / 100
            };

            const lastTransform = this.lastTransforms.get(i);
            const hasChanged =
                !lastTransform ||
                Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
                Math.abs(lastTransform.scale - newTransform.scale) > 0.001 ||
                Math.abs(lastTransform.rotation - newTransform.rotation) > 0.1 ||
                Math.abs(lastTransform.blur - newTransform.blur) > 0.1;

            if (hasChanged) {
                const transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
                const filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : '';

                card.style.transform = transform;
                card.style.filter = filter;

                this.lastTransforms.set(i, newTransform);
            }

            if (i === this.cards.length - 1) {
                const isInView = scrollTop >= pinStart && scrollTop <= pinEnd;
                if (isInView && !this.stackCompleted) {
                    this.stackCompleted = true;
                    if (this.options.onStackComplete) {
                        this.options.onStackComplete();
                    }
                } else if (!isInView && this.stackCompleted) {
                    this.stackCompleted = false;
                }
            }
        });

        this.isUpdating = false;
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.lenis) {
            this.lenis.destroy();
        }
        this.stackCompleted = false;
        this.cards = [];
        this.lastTransforms.clear();
        this.isUpdating = false;
    }

    // Public methods for updating options
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.updateCardTransforms();
    }

    // Method to add new cards dynamically
    addCard(cardElement, index = null) {
        if (index !== null && index >= 0 && index < this.cards.length) {
            this.cards.splice(index, 0, cardElement);
        } else {
            this.cards.push(cardElement);
        }
        this.setupCards();
        this.updateCardTransforms();
    }

    // Method to remove cards
    removeCard(index) {
        if (index >= 0 && index < this.cards.length) {
            this.cards.splice(index, 1);
            this.lastTransforms.delete(index);
            this.updateCardTransforms();
        }
    }
}