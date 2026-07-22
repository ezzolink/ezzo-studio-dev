const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ptyDir = path.join(__dirname, 'node_modules', 'node-pty')

// Get Electron version's Node headers
const electronVersion = require(path.join(__dirname, '..', 'node_modules', 'electron', 'package.json')).version
const electronABI = process.env.npm_config_target_abi || ''

console.log('Building node-pty for Electron', electronVersion)

// Step 1: Configure with electron headers
try {
  execSync(
    `npx node-gyp configure --msvs_version=2022 --target=${electronVersion} --arch=x64 --dist-url=https://electronjs.org/headers --runtime=electron --devdir="${require('os').homedir()}/.electron-gyp"`,
    { cwd: ptyDir, stdio: 'inherit' }
  )
} catch (e) {
  console.error('Configure failed:', e.message)
  process.exit(1)
}

// Step 2: Patch all vcxproj files to disable Spectre mitigation
const buildDir = path.join(ptyDir, 'build')
function patchVcxproj(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      patchVcxproj(full)
    } else if (entry.endsWith('.vcxproj')) {
      let content = fs.readFileSync(full, 'utf8')
      const patched = content.replace(/<SpectreMitigation>Spectre<\/SpectreMitigation>/g, '<SpectreMitigation>false</SpectreMitigation>')
      if (patched !== content) {
        fs.writeFileSync(full, patched, 'utf8')
        console.log('Patched:', entry)
      }
    }
  }
}
patchVcxproj(buildDir)

// Step 3: Build
try {
  execSync('npx node-gyp build --msvs_version=2022', { cwd: ptyDir, stdio: 'inherit' })
  console.log('node-pty built successfully!')
} catch (e) {
  console.error('Build failed:', e.message)
  process.exit(1)
}
