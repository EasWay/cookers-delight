<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0D1B0D">
    <title>Order #{{ $orderId }} — Cookers Delight</title>
    @vite(['resources/css/app.css'])
</head>

<body
    class="min-h-screen flex flex-col items-center justify-center p-6 space-y-6"
    style="background: var(--cd-bg); color: var(--cd-text); font-family: var(--font-sans);">


    {{-- Restaurant name --}}
    <div class="text-center space-y-1">
        <h1
            class="text-4xl font-bold"
            style="font-family: var(--font-serif); color: var(--cd-amber);">
            Cookers Delight
        </h1>
        <p class="text-xs uppercase tracking-widest" style="color: var(--cd-text-muted);">
            Live order tracking
        </p>
    </div>


    {{-- Table · Location · Order # banner --}}
    @if(session('cd_table_number'))
    <div
        class="w-full max-w-sm flex items-center justify-around px-6 py-4 rounded-2xl"
        style="background: var(--cd-surface);">

        <div class="text-center">
            <p class="text-[10px] uppercase tracking-widest" style="color: var(--cd-text-muted);">Table</p>
            <p class="font-bold text-4xl leading-none" style="color: var(--cd-amber);">
                {{ session('cd_table_number') }}
            </p>
        </div>

        <div class="w-px h-10" style="background: var(--cd-border);"></div>

        <div class="text-center">
            <p class="text-[10px] uppercase tracking-widest" style="color: var(--cd-text-muted);">Location</p>
            <p class="font-semibold text-sm" style="color: var(--cd-text);">
                {{ session('cd_location_name') }}
            </p>
        </div>

        <div class="w-px h-10" style="background: var(--cd-border);"></div>

        <div class="text-center">
            <p class="text-[10px] uppercase tracking-widest" style="color: var(--cd-text-muted);">Order</p>
            <p class="font-semibold text-sm" style="color: var(--cd-text);">#{{ $orderId }}</p>
        </div>
    </div>
    @endif


    {{-- Live status card --}}
    <div
        class="w-full max-w-sm rounded-2xl p-8 text-center space-y-5"
        style="background: var(--cd-surface);">

        {{-- Pulsing status dot --}}
        <div class="flex justify-center">
            <div
                id="status-dot"
                class="status-ping w-4 h-4 rounded-full"
                style="background: var(--cd-amber-light);">
            </div>
        </div>

        <div class="space-y-2">
            <p
                id="status-text"
                class="text-3xl font-semibold"
                style="font-family: var(--font-serif); color: var(--cd-text);">
                Pending
            </p>
            <p
                id="status-sub"
                class="text-sm"
                style="color: var(--cd-text-muted);">
                Waiting for payment confirmation…
            </p>
        </div>
    </div>


    {{-- Estimated wait --}}
    @if(!empty($estimatedWaitMinutes))
    <div
        class="w-full max-w-sm flex items-center gap-4 px-6 py-4 rounded-2xl"
        style="background: var(--cd-surface);">
        <svg class="w-5 h-5 flex-shrink-0" style="color: var(--cd-amber);"
             fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        <div>
            <p class="text-[10px] uppercase tracking-widest" style="color: var(--cd-text-muted);">
                Estimated wait
            </p>
            <p class="font-bold" style="color: var(--cd-text);">~{{ $estimatedWaitMinutes }} minutes</p>
        </div>
    </div>
    @endif


    {{-- Progress steps --}}
    <div class="w-full max-w-sm px-2">
        <div class="relative flex items-start justify-between">

            {{-- Connector line --}}
            <div
                class="absolute top-4 left-[12.5%] right-[12.5%] h-0.5"
                style="background: var(--cd-border);"
                aria-hidden="true">
            </div>

            @php
                $steps = [
                    ['key' => 'received',  'label' => 'Received',  'emoji' => '📋'],
                    ['key' => 'preparing', 'label' => 'Preparing', 'emoji' => '👨‍🍳'],
                    ['key' => 'ready',     'label' => 'Ready',     'emoji' => '✅'],
                    ['key' => 'served',    'label' => 'Served',    'emoji' => '🍽️'],
                ];
            @endphp

            @foreach($steps as $step)
            <div
                id="step-{{ $step['key'] }}"
                class="flex flex-col items-center gap-2 relative z-10 transition-all duration-500"
                style="width: 25%; opacity: 0.3;">

                <div
                    class="w-8 h-8 rounded-full flex items-center justify-center text-base transition-all duration-500"
                    style="background: var(--cd-surface);">
                    {{ $step['emoji'] }}
                </div>

                <span class="text-[10px] text-center leading-tight" style="color: var(--cd-text-muted);">
                    {{ $step['label'] }}
                </span>
            </div>
            @endforeach

        </div>
    </div>


    {{-- Served confirmation --}}
    <p
        id="done-msg"
        class="hidden text-center font-semibold text-lg"
        style="color: var(--cd-amber);">
        Enjoy your meal! 🎉
    </p>


    {{-- Subtle footer --}}
    <p class="text-xs text-center" style="color: var(--cd-text-muted); opacity: 0.5;">
        Updates arrive automatically — no refresh needed
    </p>


<script>
const sseUrl   = @json($sseUrl);
const steps    = ['received', 'preparing', 'ready', 'served'];
const messages = {
    Pending:   'Waiting for payment confirmation…',
    Received:  'Order received — the kitchen is getting started.',
    Preparing: 'Chefs are cooking your food. Sit tight!',
    Ready:     'Your food is ready — your waiter is on the way.',
    Served:    'Enjoy your meal!',
    Cancelled: 'Your order was cancelled. Please speak to staff.',
};

const source = new EventSource(sseUrl);

source.addEventListener('status', (e) => {
    const { status, status_color } = JSON.parse(e.data);

    document.getElementById('status-text').textContent = status;
    document.getElementById('status-sub').textContent  = messages[status] ?? '';

    const dot = document.getElementById('status-dot');
    dot.style.background = status_color ?? 'var(--cd-amber-light)';

    // Illuminate all steps up to and including the current one.
    const currentIdx = steps.indexOf(status.toLowerCase());
    steps.forEach((s, i) => {
        const el = document.getElementById('step-' + s);
        if (!el) return;
        const isActive = i <= currentIdx;
        el.style.opacity = isActive ? '1' : '0.3';
        el.querySelector('div').style.background = isActive
            ? 'var(--cd-primary)'
            : 'var(--cd-surface)';
    });
});

source.addEventListener('close', () => {
    source.close();
    document.getElementById('status-dot').classList.remove('status-ping');
    document.getElementById('done-msg').classList.remove('hidden');
});

source.addEventListener('error', () => {
    document.getElementById('status-sub').textContent =
        'Connection lost — refresh the page to check your order.';
});
</script>

</body>
</html>
