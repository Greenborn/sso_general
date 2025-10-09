#!/usr/bin/env node

/**
 * Script para limpiar sesiones expiradas y logs antiguos
 * Uso: node scripts/cleanup.js [--days=90]
 */

require('dotenv').config();
const Session = require('../src/models/Session');
const AuditLog = require('../src/models/AuditLog');

const args = process.argv.slice(2);
const daysToKeep = parseInt(
  args.find(arg => arg.startsWith('--days='))?.split('=')[1] || '90'
);

async function cleanup() {
  console.log('\n🧹 Iniciando limpieza de base de datos...\n');
  
  try {
    // Limpiar sesiones expiradas
    console.log('Limpiando sesiones expiradas...');
    const sessionsDeleted = await Session.cleanExpired();
    console.log(`✅ ${sessionsDeleted} sesiones eliminadas\n`);

    // Limpiar logs antiguos
    console.log(`Limpiando logs anteriores a ${daysToKeep} días...`);
    const logsDeleted = await AuditLog.cleanOld(daysToKeep);
    console.log(`✅ ${logsDeleted} registros de auditoría eliminados\n`);

    console.log('✨ Limpieza completada exitosamente\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

cleanup();
