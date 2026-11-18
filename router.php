<?php
declare(strict_types=1);

/**
 * Local router for PHP's built-in development server.
 * Run from the project root: php -S 127.0.0.1:8000 router.php
 *
 * Examples:
 *   /                 -> index.html (served by PHP itself)
 *   /home             -> pages/home.html
 *   /about            -> pages/about.html
 *   /css/style.css    -> served as a static file by PHP
 *   /js/app.js        -> served as a static file by PHP
 *   /pages/home.html  -> served directly if someone requests the physical path
 */

$root = realpath(__DIR__);
if ($root === false) {
    http_response_code(500);
    echo "Server configuration error.";
    return true;
}

function routerIsInsideRoot(string $file, string $root): bool
{
    $prefix = rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    return $file === $root || strpos($file, $prefix) === 0;
}

function routerSendError(int $status, string $message): bool
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
        echo $message . "\n";
    }
    return true;
}

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$urlPath = parse_url($uri, PHP_URL_PATH);
if (!is_string($urlPath)) {
    return routerSendError(400, 'Bad Request');
}

// Decode URL-encoded characters before resolving the path.
$path = rawurldecode($urlPath);

// Reject suspicious path forms rather than letting them escape the project root.
if (strpos($path, "\0") !== false || strpos($path, '\\') !== false) {
    return routerSendError(400, 'Bad Request');
}
foreach (explode('/', $path) as $segment) {
    if ($segment === '..') {
        return routerSendError(400, 'Bad Request');
    }
}

// Normalize repeated and trailing slashes: /home/ becomes /home.
$path = '/' . trim(preg_replace('~/+~', '/', $path) ?? $path, '/');
if ($path === '/') {
    // Let PHP serve index.html (or index.php) normally from the project root.
    return false;
}

$relativePath = ltrim($path, '/');
$requestedPath = $root . DIRECTORY_SEPARATOR
    . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
$realRequestedPath = realpath($requestedPath);

// Never expose the router directly.
$realRouter = realpath(__FILE__);
if ($realRequestedPath !== false && $realRouter !== false && $realRequestedPath === $realRouter) {
    return routerSendError(404, 'Not Found');
}

// Existing files/directories (CSS, JS, images, text files, PHP endpoints, etc.)
// are handled by PHP's built-in server, which supplies its normal MIME handling.
if (
    $realRequestedPath !== false
    && routerIsInsideRoot($realRequestedPath, $root)
    && (is_file($realRequestedPath) || is_dir($realRequestedPath))
) {
    return false;
}

// Only extensionless URLs are treated as page routes. Do not return false for a
// missing asset here: on recent PHP versions, a missing path that looks like a
// filename can fall back to index.html. Return a real 404 instead.
if (pathinfo($relativePath, PATHINFO_EXTENSION) !== '') {
    return routerSendError(404, 'Not Found');
}

// Extensionless route candidates, in priority order:
//   /home -> pages/home.html
//   /home -> home.html (optional alternative)
//   /home -> home/index.html (directory-style route)
//   /home -> pages/home/index.html (optional alternative)
$candidates = [
    $root . DIRECTORY_SEPARATOR . 'pages' . DIRECTORY_SEPARATOR . $relativePath . '.html',
    $root . DIRECTORY_SEPARATOR . $relativePath . '.html',
    $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath)
        . DIRECTORY_SEPARATOR . 'index.html',
    $root . DIRECTORY_SEPARATOR . 'pages' . DIRECTORY_SEPARATOR
        . str_replace('/', DIRECTORY_SEPARATOR, $relativePath)
        . DIRECTORY_SEPARATOR . 'index.html',
];

$pageFile = false;
foreach ($candidates as $candidate) {
    $realCandidate = realpath($candidate);
    if (
        $realCandidate !== false
        && is_file($realCandidate)
        && routerIsInsideRoot($realCandidate, $root)
    ) {
        $pageFile = $realCandidate;
        break;
    }
}

if ($pageFile === false) {
    // A missing extensionless URL is a page 404.
    return routerSendError(404, 'Page Not Found');
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method !== 'GET' && $method !== 'HEAD') {
    header('Allow: GET, HEAD');
    return routerSendError(405, 'Method Not Allowed');
}

header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Content-Length: ' . (string) filesize($pageFile));

if ($method !== 'HEAD') {
    readfile($pageFile);
}

return true;
