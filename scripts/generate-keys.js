#!/usr/bin/env node

/**
 * Script para generar claves de encriptación y secrets
 * Uso: node scripts/generate-keys.js
 */

const crypto = require('crypto');

console.log('\n🔐 Generador de Claves de Seguridad\n');
console.log('='.repeat(60));

// Generar SESSION_SECRET
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('\nSESSION_SECRET:');
console.log(sessionSecret);

// Generar JWT_SECRET
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('\nJWT_SECRET:');
console.log(jwtSecret);

// Generar ENCRYPTION_KEY
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log('\nENCRYPTION_KEY:');
console.log(encryptionKey);

console.log('\n' + '='.repeat(60));
console.log('\n📝 Copia estos valores a tu archivo .env\n');
console.log('⚠️  IMPORTANTE: Nunca compartas estas claves');
console.log('⚠️  Genera nuevas claves para cada entorno (dev, prod)\n');
