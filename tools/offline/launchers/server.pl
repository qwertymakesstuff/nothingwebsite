#!/usr/bin/perl
# A tiny static web server for the offline copy of missing.website (Mac).
# Started by "Play Offline (Mac).command". Serves the site folder on http://localhost:8642/ only.
use strict;
use warnings;
use IO::Socket::INET;
use Cwd qw(abs_path);

my ($root, $port) = (abs_path($ARGV[0] // 'site'), $ARGV[1] // 8642);
my $url = "http://localhost:$port/";
my %types = (
  html => 'text/html; charset=utf-8', htm => 'text/html; charset=utf-8',
  js => 'text/javascript; charset=utf-8', mjs => 'text/javascript; charset=utf-8',
  css => 'text/css; charset=utf-8', json => 'application/json; charset=utf-8', txt => 'text/plain; charset=utf-8',
  svg => 'image/svg+xml', png => 'image/png', jpg => 'image/jpeg', jpeg => 'image/jpeg', gif => 'image/gif',
  webp => 'image/webp', ico => 'image/x-icon', mp3 => 'audio/mpeg', ogg => 'audio/ogg', wav => 'audio/wav',
  m4a => 'audio/mp4', mp4 => 'video/mp4', webm => 'video/webm', glb => 'model/gltf-binary', gltf => 'model/gltf+json',
  wasm => 'application/wasm', woff => 'font/woff', woff2 => 'font/woff2', ttf => 'font/ttf', webmanifest => 'application/manifest+json',
);

my $server = IO::Socket::INET->new(LocalAddr => '127.0.0.1', LocalPort => $port, Listen => 64, ReuseAddr => 1);
if (!$server) {
  # Already running (another launcher window is open): just open the browser.
  system('open', $url); exit 0;
}
system('open', $url) if $^O eq 'darwin';
$SIG{PIPE} = 'IGNORE';

while (my $c = $server->accept) {
  my $line = <$c>;
  if (!defined $line) { close $c; next }
  while (my $h = <$c>) { last if $h =~ /^\r?\n$/ }
  my ($method, $path) = $line =~ m{^(\w+)\s+([^\s?#]+)};
  $path //= '/';
  $path =~ s/%([0-9A-Fa-f]{2})/chr hex $1/ge;
  my $file = "$root$path";
  if ($path =~ m{(^|/)\.\.(/|$)}) { reply($c, 403, 'text/plain', 'forbidden'); next }
  if (-d $file) {
    if ($path !~ m{/$}) { print $c "HTTP/1.1 301 Moved\r\nLocation: $path/\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"; close $c; next }
    $file .= 'index.html';
  }
  if (!-f $file || !open(my $fh, '<:raw', $file)) { reply($c, 404, 'text/plain', 'not found'); next }
  else {
    local $/; my $body = <$fh>; close $fh;
    my ($ext) = $file =~ /\.([^.\/]+)$/;
    reply($c, 200, $types{lc($ext // '')} // 'application/octet-stream', $method eq 'HEAD' ? '' : $body, length $body);
  }
}

sub reply {
  my ($c, $status, $type, $body, $len) = @_;
  $len //= length $body;
  my %text = (200 => 'OK', 403 => 'Forbidden', 404 => 'Not Found');
  print $c "HTTP/1.1 $status $text{$status}\r\nContent-Type: $type\r\nContent-Length: $len\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n$body";
  close $c;
}
