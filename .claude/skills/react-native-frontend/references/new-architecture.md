# New Architecture — Fabric, TurboModules e JSI

## Contexto

A New Architecture do React Native substituiu a antiga Bridge (comunicação JSON assíncrona entre JS e nativo) por um sistema baseado em JSI que permite chamadas diretas, síncronas ou assíncronas, sem overhead de serialização.

Componentes da New Architecture:
- **JSI (JavaScript Interface)** — camada C++ que expõe objetos nativos diretamente ao JavaScript
- **Fabric** — novo renderer com suporte a Concurrent React e rendering interruptível
- **TurboModules** — módulos nativos com lazy loading, tipagem via Codegen, e chamadas via JSI
- **Codegen** — gera bindings type-safe (headers e source para iOS/Android) a partir de specs TypeScript/Flow
- **Hermes** — engine JS padrão, otimizado para mobile com startup rápido e menor uso de memória

## Habilitando a New Architecture

### Expo (SDK 52+)

Em projetos novos criados com `npx create-expo-app`, a New Architecture já vem habilitada. Para projetos existentes:

```json
// app.json
{
  "expo": {
    "newArchEnabled": true
  }
}
```

### CLI Puro (RN 0.76+)

```properties
# android/gradle.properties
newArchEnabled=true
```

```ruby
# ios/Podfile
use_react_native!(
  :new_architecture_enabled => true
)
```

Depois rode `pod install` no iOS e rebuild.

## Criando um TurboModule

### 1. Defina a spec em TypeScript

```tsx
// src/specs/NativeDeviceInfo.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getModel(): Promise<string>;
  getBatteryLevel(): Promise<number>;
  isEmulator(): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('DeviceInfo');
```

### 2. Configure o Codegen no package.json

```json
{
  "codegenConfig": {
    "name": "DeviceInfoSpec",
    "type": "modules",
    "jsSrcsDir": "src/specs",
    "android": {
      "javaPackageName": "com.myapp.deviceinfo"
    }
  }
}
```

### 3. Implemente no nativo

O Codegen gera interfaces/headers que você implementa em Kotlin (Android) e Swift/Obj-C (iOS). Siga as assinaturas geradas.

### 4. Use no JavaScript

```tsx
import DeviceInfo from '../specs/NativeDeviceInfo';

async function logDeviceInfo() {
  const model = await DeviceInfo.getModel();
  const battery = await DeviceInfo.getBatteryLevel();
  console.log(`Device: ${model}, Battery: ${battery}%`);
}
```

## Guia de Migração

### Pré-requisitos
- React Native 0.76+ ou Expo SDK 52+
- Hermes habilitado (padrão)
- Todas as dependências atualizadas

### Passo a passo

1. **Atualize o React Native/Expo** para versão compatível com New Architecture
2. **Audite dependências** — verifique se todas as libs terceiras suportam a New Architecture. Use o [React Native Directory](https://reactnative.directory/) filtrando por "New Architecture"
3. **Habilite a flag** (`newArchEnabled: true`)
4. **Teste no simulador/emulador** — verifique crashes, layouts quebrados, e módulos nativos
5. **Converta NativeModules customizados** para TurboModules (crie specs, rode Codegen, implemente interfaces)
6. **Meça performance** — compare startup time, uso de memória, e frame drops antes e depois
7. **Roll out gradual** — use feature flags se possível. Teste com beta testers antes de produção

### Armadilhas comuns
- Misturar módulos da arquitetura antiga com a nova pode causar memory leaks sutis
- Algumas libs community ainda não suportam — tenha alternativas prontas
- O Codegen precisa ser executado durante o build — configure no CI/CD
- Bridges legadas de terceiros podem precisar de wrappers/shims temporários

## Ganhos de Performance Esperados

- **Startup** — TurboModules com lazy loading reduzem significativamente o tempo de inicialização
- **Interações** — Fabric elimina frames perdidos em UIs complexas com rendering interruptível
- **Chamadas nativas** — JSI elimina overhead de serialização JSON; chamadas são 3-5x mais rápidas
- **Memória** — Hermes + lazy modules = menor footprint de memória

## Checklist de Compatibilidade

Antes de habilitar a New Architecture, verifique:
- [ ] Todas as dependências listam suporte a New Architecture
- [ ] Módulos nativos customizados foram convertidos para TurboModules
- [ ] Hermes está habilitado
- [ ] Testes E2E passam com New Architecture habilitada
- [ ] Performance foi medida antes e depois (baseline)
- [ ] CI/CD está configurado para rodar Codegen
