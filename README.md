# Image Preview 组件

一个功能完整的JavaScript图片预览组件，支持旋转、缩放、拖拽、下载等功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![JavaScript](https://img.shields.io/badge/javascript-ES6+-green.svg)

## ✨ 功能特性

- 🖼️ **图片预览** - 支持多种图片格式预览
- 🔄 **旋转功能** - 支持90°左右旋转，平滑动画
- 🔍 **缩放功能** - 鼠标滚轮缩放，指针缩放
- 🖱️ **拖拽平移** - 支持鼠标拖拽平移图片
- 💾 **下载功能** - 点击按钮直接下载图片
- ↩️ **重置功能** - 一键恢复初始状态
- 📱 **响应式设计** - 完美适配各种屏幕尺寸
- ⚡ **零依赖** - 纯JavaScript实现，无外部依赖

## 📦 快速开始

### 1. HTML 模块导入

```html
<script type="module">
  import { ImagePreview } from './src/imagePreview.js';

  const url = 'https://example.com/image.jpg';
  const fileName = 'my-image.jpg';  // 可选，不传则无法下载

  ImagePreview.view(url, fileName).error(err => {
    console.error('加载失败:', err.message);
  });
</script>
```

### 2. 动态导入

```javascript
import('./src/imagePreview.js').then(module => {
  const { ImagePreview } = module;
  
  const url = 'https://example.com/image.jpg';
  const fileName = 'my-image.jpg';  // 可选
  
  ImagePreview.view(url, fileName).catch(err => {
    console.error('加载失败:', err.message);
  });
});
```

## 🎯 使用方法

### 基础用法

```javascript
import { ImagePreview } from './src/imagePreview.js';

// 最简单的使用方式（无文件名，不能下载）
ImagePreview.view('https://example.com/image.jpg');

// 带文件名（支持下载）
ImagePreview.view('https://example.com/image.jpg', 'photo.jpg');

// 错误处理
ImagePreview.view(url, fileName)
  .error(err => {
    alert('加载失败: ' + err.message);
  });

// Promise 链式调用
ImagePreview.view(url, fileName)
  .then(result => console.log('加载成功'))
  .catch(err => console.error('加载失败', err));
```

## 📝 API 文档

### ImagePreview.view(url, fileName)

静态方法，用于创建并显示图片预览。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | String | ✅ | 图片URL地址 |
| fileName | String | ❌ | 图片文件名，用于下载时的文件名。不传则隐藏下载按钮 |

**返回值：**

返回一个类Promise对象，支持以下方法：

```javascript
{
  error(callback)    // 错误处理回调
  then(callback)     // Promise then
  catch(callback)    // Promise catch
  finally(callback)  // Promise finally
}
```

**示例：**

```javascript
// 基础示例
ImagePreview.view('https://picsum.photos/1200/800', 'my-photo.jpg');

// 错误处理
ImagePreview.view(url, fileName).error(err => {
  console.error('加载错误:', err);
  alert('加载失败: ' + err.message);
});

// Promise 用法
ImagePreview.view(url, fileName)
  .then(() => console.log('图片加载成功'))
  .catch(err => console.error('错误:', err))
  .finally(() => console.log('加载完成'));
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| Esc | 关闭预览 |
| 双击 | 重置图片 |
| 鼠标滚轮 | 缩放图片 |
| 鼠标拖拽 | 移动图片 |

## 🎮 工具栏按钮

预览时底部工具栏包含以下功能：

- **↺** - 左转（逆时针90°）
- **↻** - 右转（顺时针90°）
- **−** - 缩小
- **+** - 放大
- **⟲** - 重置（恢复初始状态）
- **⬇** - 下载（需传入fileName参数才显示）

## 📄 完整示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Preview Demo</title>
</head>
<body>
  <button id="previewBtn">点击预览图片</button>

  <script type="module">
    import { ImagePreview } from './src/imagePreview.js';

    document.getElementById('previewBtn').addEventListener('click', () => {
      const url = 'https://picsum.photos/1200/800';
      const fileName = 'sample.jpg';

      ImagePreview.view(url, fileName)
        .error(err => {
          alert('加载失败: ' + err.message);
        });
    });
  </script>
</body>
</html>
```

## 🔧 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge
- 其他支持 ES6 和 DOMMatrix 的现代浏览器

## ⚠️ 注意事项

1. **CORS问题** - 如果预览网络图片，确保服务器允许跨域请求
2. **本地开发** - 需要通过HTTP服务器运行，不能直接用file协议
3. **文件名可选** - 不传入`fileName`参数时，下载按钮会隐藏
4. **错误处理** - 建议使用`.error()`方法处理加载失败的情况

## 📦 文件结构

```
imageView/
├── README.md                 # 项目说明文档
├── index.html               # 测试演示页面
└── imagePreview.js      # 组件源码（核心文件）
```

## 💡 最佳实践

```javascript
// ✅ 推荐用法
ImagePreview.view(url, fileName)
  .error(err => {
    // 统一的错误处理
    console.error('预览失败:', err);
    showErrorNotification('图片预览失败，请重试');
  });

// ❌ 不推荐
ImagePreview.view(url);  // 会导致无法下载

// ✅ 处理用户自定义文件名
const customName = prompt('请输入文件名');
ImagePreview.view(url, customName || 'image.jpg');
```

