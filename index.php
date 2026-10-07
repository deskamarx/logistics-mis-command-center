<?php
/**
 * Logistics MIS & Executive Command Center - Main View Entrypoint
 */

require_once __DIR__ . '/config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo APP_NAME; ?></title>
    
    <!-- Google Fonts & ApexCharts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>

    <!-- Custom CSS & JS -->
    <link rel="stylesheet" href="assets/css/style.css?v=<?php echo APP_VERSION; ?>">
</head>
<body>

    <!-- Single Page App Mounting Root -->
    <div id="app-root"></div>

    <script src="assets/js/app.js?v=<?php echo APP_VERSION; ?>"></script>
</body>
</html>
