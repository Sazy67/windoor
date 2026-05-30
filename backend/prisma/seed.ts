import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create/update admin user with hashed password
  const hashedPassword = await bcrypt.hash('Sa352218', 10);
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hashedPassword, role: 'admin', isActive: true },
    create: {
      username: 'admin',
      displayName: 'Administrator',
      role: 'admin',
      isActive: true,
      password: hashedPassword,
    }
  });

  console.log('✅ Created user:', user.username);

  // Create sample customers (sadece yoksa ekle)
  const existingCustomer1 = await prisma.customer.findFirst({ where: { email: 'ahmet@example.com' } });
  const customer1 = existingCustomer1 ?? await prisma.customer.create({
    data: { name: 'Ahmet Yılmaz', phone: '+90 555 123 4567', email: 'ahmet@example.com' }
  });

  const existingCustomer2 = await prisma.customer.findFirst({ where: { email: 'ayse@example.com' } });
  const customer2 = existingCustomer2 ?? await prisma.customer.create({
    data: { name: 'Ayşe Demir', phone: '+90 555 987 6543', email: 'ayse@example.com' }
  });

  console.log('✅ Created customers');

  // Create sample products - Gates
  const interiorGate = await prisma.product.create({
    data: {
      name: 'İç Kapı Standart',
      category: 'Gate',
      subcategory: 'Interior_Gate',
      brand: 'Windoor Premium',
      createdById: user.id
    }
  });

  // Create variants for interior gate
  const gateColors = ['black', 'brown', 'grey', 'white', 'anthracite'];
  const gateDimensions = ['80x200', '90x200', '100x200'];

  for (const color of gateColors) {
    for (const dimension of gateDimensions) {
      await prisma.productVariant.create({
        data: {
          productId: interiorGate.id,
          color,
          dimension,
          salePrice: 2500 + Math.random() * 1000,
          minimumStockLevel: 5,
          sku: `GATE-INT-${color.toUpperCase()}-${dimension.replace('x', 'X')}`,
          stock: {
            create: {
              quantity: Math.floor(Math.random() * 20),
              secondQualityQty: Math.floor(Math.random() * 3)
            }
          }
        }
      });
    }
  }

  console.log('✅ Created interior gates with variants');

  // Create sample products - Windows
  const tiltTurnWindow = await prisma.product.create({
    data: {
      name: 'Pencere Tilt & Turn',
      category: 'Window',
      subcategory: 'Tilt_And_Turn',
      brand: 'Windoor Premium',
      createdById: user.id
    }
  });

  const windowDimensions = ['24x36', '24x48', '28x48', '30x60', '36x60'];
  const windowColors = ['Black', 'White'];

  for (const color of windowColors) {
    for (const dimension of windowDimensions) {
      await prisma.productVariant.create({
        data: {
          productId: tiltTurnWindow.id,
          color,
          dimension,
          type: 'Tilt_And_Turn',
          salePrice: 1500 + Math.random() * 800,
          minimumStockLevel: 10,
          sku: `WIN-TT-${color.toUpperCase()}-${dimension.replace('x', 'X')}`,
          stock: {
            create: {
              quantity: Math.floor(Math.random() * 30),
              secondQualityQty: 0
            }
          }
        }
      });
    }
  }

  console.log('✅ Created windows with variants');

  // Create sample products - Panels
  const acousticPanel = await prisma.product.create({
    data: {
      name: 'Akustik Panel',
      category: 'Panel',
      subcategory: 'Interior_Panel',
      brand: 'Windoor Acoustic',
      createdById: user.id
    }
  });

  await prisma.productVariant.create({
    data: {
      productId: acousticPanel.id,
      dimension: '2x9',
      type: 'Acoustic',
      salePrice: 850,
      minimumStockLevel: 20,
      sku: 'PANEL-ACOUSTIC-2X9',
      stock: {
        create: {
          quantity: 45,
          secondQualityQty: 5
        }
      }
    }
  });

  console.log('✅ Created panels with variants');

  // Create sample products - Accessories
  const doorHandle = await prisma.product.create({
    data: {
      name: 'Kapı Kulpu',
      category: 'Accessory',
      brand: 'Windoor Hardware',
      createdById: user.id
    }
  });

  const handleColors = ['Chrome', 'Black', 'Gold'];
  for (const color of handleColors) {
    await prisma.productVariant.create({
      data: {
        productId: doorHandle.id,
        color,
        dimension: 'Standard',
        salePrice: 150 + Math.random() * 100,
        minimumStockLevel: 50,
        sku: `HANDLE-${color.toUpperCase()}`,
        stock: {
          create: {
            quantity: Math.floor(Math.random() * 100) + 50,
            secondQualityQty: 0
          }
        }
      }
    });
  }

  console.log('✅ Created accessories with variants');

  // Create sample consumable
  const pvcAdhesive = await prisma.product.create({
    data: {
      name: 'PVC Yapıştırıcı',
      category: 'Consumable',
      brand: 'Windoor Supplies',
      createdById: user.id
    }
  });

  await prisma.productVariant.create({
    data: {
      productId: pvcAdhesive.id,
      dimension: '500ml',
      salePrice: 75,
      minimumStockLevel: 100,
      sku: 'ADHESIVE-PVC-500ML',
      stock: {
        create: {
          quantity: 250,
          secondQualityQty: 0
        }
      }
    }
  });

  console.log('✅ Created consumables with variants');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
