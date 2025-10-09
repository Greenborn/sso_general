#!/usr/bin/env node

/**
 * Script para agregar una nueva app a la lista blanca
 * Uso: node scripts/add-allowed-app.js "NombreApp" "https://url1.com,https://url2.com"
 */

require('dotenv').config();
const AllowedApp = require('../src/models/AllowedApp');

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('\n❌ Error: Parámetros insuficientes\n');
  console.log('Uso: node scripts/add-allowed-app.js "NombreApp" "https://url1.com,https://url2.com"\n');
  console.log('Ejemplo:');
  console.log('  node scripts/add-allowed-app.js "MiApp" "https://mi-app.com,https://mi-app.com/callback"\n');
  process.exit(1);
}

const appName = args[0];
const urlsString = args[1];
const urls = urlsString.split(',').map(url => url.trim());

async function addApp() {
  console.log('\n📝 Agregando nueva aplicación...\n');
  console.log(`Nombre: ${appName}`);
  console.log(`URLs permitidas:`);
  urls.forEach(url => console.log(`  - ${url}`));
  
  try {
    // Verificar si ya existe
    const existing = await AllowedApp.findByName(appName);
    if (existing) {
      console.log(`\n⚠️  La aplicación "${appName}" ya existe`);
      console.log('URLs actuales:', existing.allowed_redirect_urls);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('\n¿Deseas actualizar las URLs? (s/n): ', async (answer) => {
        if (answer.toLowerCase() === 's') {
          await AllowedApp.updateUrls(existing.id, urls);
          console.log('\n✅ URLs actualizadas exitosamente\n');
        } else {
          console.log('\nOperación cancelada\n');
        }
        readline.close();
        process.exit(0);
      });
    } else {
      // Crear nueva app
      const app = await AllowedApp.create({
        name: appName,
        urls: urls
      });
      
      console.log(`\n✅ Aplicación creada exitosamente (ID: ${app.id})\n`);
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Error al agregar aplicación:', error.message);
    process.exit(1);
  }
}

addApp();
