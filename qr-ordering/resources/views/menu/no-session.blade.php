<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cookers Delight</title>
    @vite(['resources/css/app.css'])
</head>
<body class="min-h-screen flex items-center justify-center p-8"
      style="background: var(--cd-bg); color: var(--cd-text); font-family: var(--font-sans);">

    <div class="text-center max-w-xs space-y-6">

        <div class="text-7xl">🍽️</div>

        <div class="space-y-1">
            <h1 class="text-4xl font-bold tracking-wide"
                style="font-family: var(--font-serif); color: var(--cd-amber);">
                Cookers Delight
            </h1>
            <p class="text-sm" style="color: var(--cd-text-muted);">
                Authentic Ghanaian Cuisine
            </p>
        </div>

        <div class="rounded-2xl p-6 space-y-3" style="background: var(--cd-surface);">
            <p class="font-semibold" style="color: var(--cd-text);">
                Please scan the QR code on your table to browse our menu and order.
            </p>
            <p class="text-sm" style="color: var(--cd-text-muted);">
                If you need help, a member of staff will be happy to assist you.
            </p>
        </div>

    </div>

</body>
</html>
