# mcp-server-cex-bn

这个 MCP 服务器提供了全面的币安现货和合约交易功能。

## 功能特性

### 现货交易操作
- 执行现货交易操作（限价/市价订单）
- 监控账户余额
- 跟踪和管理未完成订单
- 取消现有订单

### 合约交易操作
- 创建各种类型的合约订单（限价、市价、止损、止盈等）
- 管理杠杆设置（1-125倍）
- 监控合约持仓和账户信息
- 跟踪资金费率
- 支持单向持仓和对冲模式
- 高级订单类型，包括追踪止损和只减仓订单

### 工具

#### API 配置

##### `configure_api_keys`
安全存储币安 API 凭证：
```typescript
await configureBinanceApiKeys({
  apiKey: '你的API密钥',
  apiSecret: '你的API密钥'
});
```

#### 现货交易工具

##### `create_spot_order`
创建限价或市价订单：
```typescript
// 限价订单
await createSpotOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  quantity: '0.001',
  price: '40000'
});

// 市价订单
await createSpotOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'MARKET',
  quantity: '0.001'
});
```

##### `cancel_order`
取消现有订单：
```typescript
await cancelOrder({
  symbol: 'BTCUSDT',
  orderId: '12345678'
});
```

##### `get_balances`
查询账户余额：
```typescript
const balances = await getBalances();
// 返回: { BTC: '0.1', USDT: '1000', ... }
```

##### `get_open_orders`
列出所有未完成订单：
```typescript
const orders = await getOpenOrders({
  symbol: 'BTCUSDT' // 可选：指定交易对
});
```

#### 合约交易工具

##### `create_futures_order`
创建各种类型的合约订单：
```typescript
// 限价订单
await createFuturesOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  quantity: '0.001',
  price: '40000',
  timeInForce: 'GTC'
});

// 止损市价订单
await createFuturesOrder({
  symbol: 'BTCUSDT',
  side: 'SELL',
  type: 'STOP_MARKET',
  quantity: '0.001',
  stopPrice: '38000'
});

// 追踪止损订单
await createFuturesOrder({
  symbol: 'BTCUSDT',
  side: 'SELL',
  type: 'TRAILING_STOP_MARKET',
  quantity: '0.001',
  callbackRate: '1.0' // 1% 回调率
});
```

##### `set_futures_leverage`
调整交易对的杠杆倍数：
```typescript
await setFuturesLeverage({
  symbol: 'BTCUSDT',
  leverage: 10  // 1-125倍
});
```

##### `get_futures_positions`
获取所有开放的合约持仓：
```typescript
const positions = await getFuturesPositions();
```

##### `get_futures_account`
获取详细的合约账户信息：
```typescript
const account = await getFuturesAccount();
```

##### `get_funding_rate`
获取合约交易对的资金费率：
```typescript
const fundingRate = await getFundingRate({
  symbol: 'BTCUSDT'
});
```

##### `cancel_futures_order`
取消现有的合约订单：
```typescript
await cancelFuturesOrder({
  symbol: 'BTCUSDT',
  orderId: '12345678'
});
```

## 合约交易详情

### 持仓模式
- 单向持仓模式：每个交易对只能持有一个方向的仓位
  * 默认模式，仓位管理更简单
  * 总持仓量是所有订单的总和
- 对冲模式：可以同时持有多空仓位
  * 允许同时持有多头和空头仓位
  * 每个仓位有独立的保证金要求

### 保证金类型
- 逐仓保证金：为每个仓位单独设置保证金
  * 风险限制在分配的保证金内
  * 每个仓位可以设置独立的杠杆倍数
- 全仓保证金：所有仓位共享保证金
  * 更高的资金使用效率
  * 所有仓位共享风险

### 资金费率
永续合约使用资金费率来保持合约价格与现货价格的对齐：
- 正费率：多头支付空头
- 负费率：空头支付多头
- 每8小时结算一次

## 安全注意事项

### 现货交易安全
- 永远不要将 API 密钥提交到版本控制系统
- 使用环境变量或安全的密钥存储
- 限制 API 密钥权限仅用于所需操作
- 定期轮换您的 API 密钥

### 合约交易安全
- 根据风险承受能力设置适当的杠杆倍数
- 始终使用止损订单限制潜在损失
- 密切监控强平价格
- 定期检查仓位风险和保证金比率
- 考虑使用只减仓订单进行风险管理
- 使用全仓保证金时要格外谨慎，因为风险是共享的

## 速率限制

- 遵守币安 API 速率限制
- 默认速率限制：
  - 订单操作每分钟 1200 个请求
  - 市场数据每秒 100 个请求
- 实现适当的速率限制错误处理

## 错误处理

### 常见错误场景
- 无效的 API 凭证
- 余额或保证金不足
- 无效的订单参数
- 超出速率限制
- 网络连接问题

### 合约特定错误
- InsufficientMarginError: 保证金不足
- InvalidPositionModeError: 持仓模式设置错误
- OrderValidationError: 无效的合约订单参数

错误处理示例：
```typescript
try {
  await createFuturesOrder({
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'LIMIT',
    quantity: '0.001',
    price: '40000',
    timeInForce: 'GTC'
  });
} catch (error) {
  if (error instanceof InsufficientMarginError) {
    console.error('保证金不足');
  } else if (error instanceof InvalidPositionModeError) {
    console.error('持仓模式无效');
  } else if (error instanceof OrderValidationError) {
    console.error('订单参数无效');
  }
}
```

## 项目结构

```
.
├── src/
│   ├── index.ts                 # 服务器入口
│   ├── services/
│   │   ├── binance.ts          # 币安 API 集成
│   │   ├── keystore.ts         # API 密钥管理
│   │   └── tools.ts            # 交易工具实现
│   └── types/
│       ├── binance.ts          # 币安类型定义
│       └── binance-connector.d.ts  # API 客户端类型
├── README.md
├── README_CN.md
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

## 开发

1. 设置环境变量：

在根目录创建 `.env` 文件，并设置您的币安 API 凭证：

```txt
BINANCE_API_KEY=你的API密钥
BINANCE_API_SECRET=你的API密钥
```

2. 安装依赖：

```bash
pnpm install
```

构建服务器：

```bash
pnpm build
```

用于自动重新构建的开发模式：

```bash
pnpm watch
```

## 安装

1. 克隆仓库
2. 安装依赖：
```bash
pnpm install
```
3. 在 `.env` 中配置您的币安 API 凭证
4. 构建并启动服务器：
```bash
pnpm build
pnpm start
```
```

### 调试

由于 MCP 服务器通过标准输入输出进行通信，调试可能具有挑战性。我们建议使用 [MCP Inspector](https://github.com/modelcontextprotocol/inspector)，可以通过包脚本使用：

```bash
pnpm inspector
```

Inspector 将提供一个 URL，用于在浏览器中访问调试工具。


