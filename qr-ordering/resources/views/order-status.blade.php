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


    {{-- Prominent order number card — staff can see this when customer shows their screen --}}
    <div
        class="w-full max-w-sm rounded-2xl px-6 py-5 flex items-center justify-between"
        style="background: var(--cd-primary); border: 1px solid var(--cd-amber);">
        <div>
            <p class="text-[10px] uppercase tracking-widest font-semibold mb-1"
               style="color: var(--cd-amber-light); opacity: 0.85;">Order Number</p>
            <p class="text-4xl font-bold leading-none" style="color: #fff;">#{{ $orderId }}</p>
        </div>
        <div class="text-right">
            <p class="text-[10px] uppercase tracking-widest font-semibold mb-1"
               style="color: var(--cd-amber-light); opacity: 0.85;">Show this to staff</p>
            <svg class="w-8 h-8 ml-auto" style="color: var(--cd-amber);"
                 fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
        </div>
    </div>


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
                Payment Confirmed
            </p>
            <p
                id="status-sub"
                class="text-sm"
                style="color: var(--cd-text-muted);">
                Connecting to the kitchen…
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


    {{-- WhatsApp receipt button (only shown when customer chose WhatsApp) --}}
    @if($receiptChannel === 'whatsapp' && $whatsappReceiptUrl)
    <a
        href="{{ $whatsappReceiptUrl }}"
        target="_blank"
        rel="noopener"
        class="w-full max-w-sm flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-base tracking-wide transition-all active:scale-95"
        style="background:#25D366;color:#fff;">
        <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
        Save receipt to WhatsApp
    </a>
    @endif

    {{-- Subtle footer --}}
    <p class="text-xs text-center" style="color: var(--cd-text-muted); opacity: 0.5;">
        Updates arrive automatically — no refresh needed
    </p>


<script>
const pollUrl  = @json($pollUrl);
const steps    = ['received', 'preparing', 'ready', 'served'];
const messages = {
    'Payment Confirmed': 'Connecting to the kitchen…',
    Pending:             'Connecting to the kitchen…',
    Received:            '✅ Your order is in! The kitchen has it.',
    Preparing:           '👨‍🍳 Chefs are cooking your food. Sit tight!',
    Ready:               '🔔 Your food is ready — waiter is on the way!',
    Served:              '🍽️ Enjoy your meal!',
    Cancelled:           'Your order was cancelled. Please speak to staff.',
};

let pollInterval = null;
let consecutiveErrors = 0;

function applyStatus(status, statusColor) {
    document.getElementById('status-text').textContent = status;
    document.getElementById('status-sub').textContent  = messages[status] ?? '';

    const dot = document.getElementById('status-dot');
    dot.style.background = statusColor ?? 'var(--cd-amber-light)';

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
}

function stopPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = null;
    document.getElementById('status-dot').classList.remove('status-ping');
    document.getElementById('done-msg').classList.remove('hidden');
}

async function checkStatus() {
    try {
        const r = await fetch(pollUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        if (!r.ok) return; // transient server error — retry next tick
        consecutiveErrors = 0;

        const data = await r.json();
        applyStatus(data.status, data.status_color);

        if (data.terminal) stopPolling();
    } catch {
        consecutiveErrors++;
        if (consecutiveErrors >= 3) {
            document.getElementById('status-sub').textContent =
                'Connection lost — refresh the page to check your order.';
        }
    }
}

// Poll immediately then every 4 seconds.
checkStatus();
pollInterval = setInterval(checkStatus, 4000);
</script>

</body>
</html>
