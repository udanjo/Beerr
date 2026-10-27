# Testes em React Native

## Stack Recomendada

| Camada | Ferramenta | O que testa |
|--------|-----------|-------------|
| Unitário | Jest + jest-expo | Funções puras, hooks, utils, reducers |
| Componente | React Native Testing Library (RNTL) | Comportamento de componentes como o usuário interage |
| E2E | Maestro | Fluxos completos no simulador/device real |

Proporção ideal: ~70% unitários, ~20% componente, ~10% E2E.

## Setup com Expo

```bash
npx expo install jest-expo jest @testing-library/react-native -- --save-dev
```

```json
// package.json
{
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
    ],
    "setupFilesAfterSetup": ["<rootDir>/src/test-utils/setup.ts"]
  }
}
```

```tsx
// src/test-utils/setup.ts
import '@testing-library/react-native/extend-expect';
```

## Setup com CLI Puro

```bash
npm install --save-dev jest @testing-library/react-native @types/jest
```

```json
// package.json
{
  "jest": {
    "preset": "react-native",
    "setupFilesAfterSetup": ["<rootDir>/src/test-utils/setup.ts"]
  }
}
```

## Testes Unitários

Teste funções puras, utils, e lógica de negócio isoladamente:

```tsx
// src/shared/utils/__tests__/formatCurrency.test.ts
import { formatCurrency } from '../formatCurrency';

describe('formatCurrency', () => {
  it('formats BRL correctly', () => {
    expect(formatCurrency(1234.5, 'BRL')).toBe('R$ 1.234,50');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'BRL')).toBe('R$ 0,00');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-50, 'BRL')).toBe('-R$ 50,00');
  });
});
```

### Testando hooks customizados

```tsx
// src/shared/hooks/__tests__/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '../useDebounce';

jest.useFakeTimers();

test('debounces value after delay', () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 500),
    { initialProps: { value: 'hello' } },
  );

  expect(result.current).toBe('hello');

  rerender({ value: 'world' });
  expect(result.current).toBe('hello'); // ainda não atualizou

  act(() => jest.advanceTimersByTime(500));
  expect(result.current).toBe('world'); // agora sim
});
```

## Testes de Componente com RNTL

O princípio central: teste como o usuário usa, não como o código é implementado.

### Queries por ordem de preferência
1. `getByRole` — mais próximo de como assistive tech encontra elementos
2. `getByLabelText` — para inputs com label de acessibilidade
3. `getByText` — para textos visíveis
4. `getByPlaceholderText` — para inputs
5. `getByTestId` — último recurso (escapa do teste de acessibilidade)

### Exemplo completo: formulário com validação

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  const onSubmit = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    onSubmit.mockClear();
  });

  it('submits with valid data', async () => {
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'user@test.com');
    await user.type(screen.getByLabelText('Senha'), '12345678');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: '12345678',
    });
  });

  it('shows error for invalid email', async () => {
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'invalid');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByText('Email inválido')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables button while submitting', async () => {
    onSubmit.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'user@test.com');
    await user.type(screen.getByLabelText('Senha'), '12345678');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  });
});
```

### Testando componentes com TanStack Query

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductList } from '../ProductList';
import { productService } from '../../services/productService';

jest.mock('../../services/productService');

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

test('renders products after loading', async () => {
  (productService.getAll as jest.Mock).mockResolvedValue([
    { id: '1', name: 'Produto A', price: 29.9 },
    { id: '2', name: 'Produto B', price: 49.9 },
  ]);

  renderWithQuery(<ProductList />);

  // Verifica loading state
  expect(screen.getByText('Carregando...')).toBeTruthy();

  // Espera os dados aparecerem
  await waitFor(() => {
    expect(screen.getByText('Produto A')).toBeTruthy();
    expect(screen.getByText('Produto B')).toBeTruthy();
  });
});
```

## Mocking

### Mock de navegação

```tsx
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { productId: '123' } }),
}));
```

### Mock de AsyncStorage

```tsx
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
```

### Mock de módulos nativos

```tsx
// __mocks__/expo-secure-store.ts
export const getItemAsync = jest.fn();
export const setItemAsync = jest.fn();
export const deleteItemAsync = jest.fn();
```

## Testes E2E com Maestro

### Instalação

```bash
# macOS
brew install maestro

# Ou via script
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Estrutura de fluxos

```
e2e/
├── flows/
│   ├── auth/
│   │   ├── login.yaml
│   │   └── register.yaml
│   ├── checkout/
│   │   └── purchase.yaml
│   └── navigation/
│       └── tab-switching.yaml
└── maestro.yaml  # config global
```

### Exemplo: fluxo de login

```yaml
# e2e/flows/auth/login.yaml
appId: com.myapp
---
- launchApp:
    clearState: true
- tapOn: "Email"
- inputText: "user@test.com"
- tapOn: "Senha"
- inputText: "12345678"
- tapOn: "Entrar"
- assertVisible: "Bem-vindo"
- assertVisible: "Home"
```

### Executando

```bash
# Rodar um fluxo
maestro test e2e/flows/auth/login.yaml

# Rodar todos os fluxos
maestro test e2e/flows/
```

### Quando usar E2E
- Fluxo de autenticação completo (login, registro, forgot password)
- Fluxo de compra/checkout
- Onboarding de primeiro uso
- Navegação principal entre tabs/stacks
- Fluxos que envolvem permissões nativas (câmera, notificações)

## Integração com CI/CD

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v4

  e2e-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx expo prebuild --platform ios
      - run: npx expo run:ios --configuration Release
      - run: |
          brew install maestro
          maestro test e2e/flows/
```

## Boas Práticas

1. **Teste comportamento, não implementação** — se você refatorar o componente e o teste quebra sem mudar o comportamento visível, o teste é frágil
2. **Prefira `userEvent` a `fireEvent`** — `userEvent` simula interações mais próximas do real
3. **Evite snapshot tests de telas inteiras** — são muito frágeis e geram diffs enormes. Use apenas para componentes pequenos e estáveis
4. **Resete estado entre testes** — `beforeEach` para limpar mocks, AsyncStorage, estado de navegação
5. **Não teste libs terceiras** — confie que React Navigation, Zustand, etc. funcionam. Teste seu código
6. **Coverage como guia, não como meta** — 80% é um bom alvo, mas cobertura alta não garante testes bons
7. **Testes rápidos** — um teste unitário deveria rodar em <100ms. Se está lento, provavelmente está testando demais
8. **Nomeie testes descritivamente** — o nome deve descrever o cenário e o resultado esperado
