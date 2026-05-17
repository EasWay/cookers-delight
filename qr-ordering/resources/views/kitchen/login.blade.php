<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Kitchen Access — Cookers Delight</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <style>
        :root {
            --cd-bg: #0D1B0D;
            --cd-surface: #152415;
            --cd-surface-2: #1A2E1A;
            --cd-amber: #D97706;
            --cd-text: #F5F0E8;
            --cd-text-muted: #7A8F7A;
            --cd-primary: #1B5E20;
            --cd-border: rgba(245,240,232,0.08);
            --font-serif: 'Cormorant Garamond', Georgia, serif;
            --font-sans: 'Syne', system-ui, sans-serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background: var(--cd-bg);
            color: var(--cd-text);
            font-family: var(--font-sans);
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }

        .login-card {
            background: var(--cd-surface);
            border: 1px solid var(--cd-border);
            border-radius: 24px;
            padding: 2.5rem 2rem;
            width: 100%;
            max-width: 360px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2rem;
            box-shadow: 0 24px 64px rgba(0,0,0,0.5);
        }

        .logo {
            font-family: var(--font-serif);
            font-size: 2rem;
            font-weight: 600;
            color: var(--cd-amber);
            letter-spacing: 0.02em;
            text-align: center;
            line-height: 1.1;
        }

        .subtitle {
            font-size: 0.8rem;
            color: var(--cd-text-muted);
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin-top: 0.25rem;
        }

        /* PIN dot indicators */
        .pin-dots {
            display: flex;
            gap: 1rem;
            justify-content: center;
        }

        .pin-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid var(--cd-amber);
            background: transparent;
            transition: background 0.15s ease;
        }

        .pin-dot.filled {
            background: var(--cd-amber);
        }

        /* Numpad grid */
        .numpad {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
            width: 100%;
        }

        .num-btn {
            background: var(--cd-surface-2);
            border: 1px solid var(--cd-border);
            border-radius: 14px;
            color: var(--cd-text);
            font-family: var(--font-sans);
            font-size: 1.4rem;
            font-weight: 600;
            height: 68px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.12s ease, transform 0.08s ease;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        }

        .num-btn:active {
            background: var(--cd-primary);
            transform: scale(0.95);
        }

        .num-btn.delete {
            color: var(--cd-text-muted);
            font-size: 1.1rem;
        }

        .num-btn.confirm {
            background: var(--cd-amber);
            color: #0D1B0D;
            border-color: var(--cd-amber);
        }

        .num-btn.confirm:active {
            background: #B45309;
        }

        /* Error message */
        .error-msg {
            color: #EF4444;
            font-size: 0.85rem;
            text-align: center;
            min-height: 1.2em;
        }

        /* Shake animation */
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-6px); }
            80% { transform: translateX(6px); }
        }

        .shake {
            animation: shake 0.4s ease;
        }

        /* Hidden form */
        .hidden-form { display: none; }
    </style>
</head>
<body>
    <div class="login-card" x-data="pinPad()" x-init="init()">
        <!-- Logo -->
        <div>
            <div class="logo">Cookers Delight</div>
            <div class="subtitle">Kitchen Access</div>
        </div>

        <!-- PIN dot indicators -->
        <div class="pin-dots" :class="{ shake: shaking }" @animationend="shaking = false">
            <template x-for="i in 4" :key="i">
                <div class="pin-dot" :class="{ filled: pin.length >= i }"></div>
            </template>
        </div>

        <!-- Error message -->
        <div class="error-msg">
            @error('pin')
                {{ $message }}
            @enderror
            <span x-show="localError" x-text="localError"></span>
        </div>

        <!-- Numpad -->
        <div class="numpad">
            <template x-for="key in ['1','2','3','4','5','6','7','8','9','←','0','✓']" :key="key">
                <button
                    type="button"
                    class="num-btn"
                    :class="{
                        'delete': key === '←',
                        'confirm': key === '✓'
                    }"
                    @click="press(key)"
                    :disabled="key === '✓' && pin.length < 4"
                >
                    <span x-text="key"></span>
                </button>
            </template>
        </div>

        <!-- Hidden form for actual submission -->
        <form id="pin-form" class="hidden-form" method="POST" action="{{ route('kitchen.login') }}">
            @csrf
            <input type="hidden" name="pin" id="pin-input">
        </form>
    </div>

    <script>
        function pinPad() {
            return {
                pin: '',
                shaking: false,
                localError: '',

                init() {
                    @if ($errors->has('pin'))
                        this.shaking = true;
                        this.pin = '';
                    @endif
                },

                press(key) {
                    if (key === '←') {
                        this.pin = this.pin.slice(0, -1);
                        this.localError = '';
                        return;
                    }
                    if (key === '✓') {
                        if (this.pin.length === 4) this.submit();
                        return;
                    }
                    if (this.pin.length >= 4) return;
                    this.pin += key;

                    // Auto-submit when 4 digits entered
                    if (this.pin.length === 4) {
                        this.$nextTick(() => setTimeout(() => this.submit(), 120));
                    }
                },

                submit() {
                    document.getElementById('pin-input').value = this.pin;
                    document.getElementById('pin-form').submit();
                }
            }
        }
    </script>
</body>
</html>
