#!/usr/bin/env node

/**
 * Script para agregar app_id a las aplicaciones existentes
 * Uso: node scripts/update-app-ids.js
 */

const db = require('../src/config/database');

async function updateAppIds() {
  try {
    console.log('🔄 Actualizando app_ids en allowed_apps...\n');

    // Obtener todas las apps
    const apps = await db('allowed_apps').select('*');

    for (const app of apps) {
      // Generar app_id desde app_name (convertir a snake_case)
      const appId = app.app_name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^a-z0-9]+/g, '_') // Reemplazar caracteres especiales con _
        .replace(/^_+|_+$/g, ''); // Eliminar _ al inicio y final

      // Actualizar solo si no tiene app_id
      if (!app.app_id) {
        await db('allowed_apps')
          .where({ id: app.id })
          .update({ app_id: appId });

        console.log(`✅ App "${app.app_name}" -> app_id: "${appId}"`);
      } else {
        console.log(`ℹ️  App "${app.app_name}" ya tiene app_id: "${app.app_id}"`);
      }
    }

    console.log('\n✅ Actualización completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error actualizando app_ids:', error);
    process.exit(1);
  }
}

updateAppIds();
