import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import chalk from 'chalk';

// 引入多页面配置文件
const pages = require('./pages.json');
// 获取"npm run dev/build --page="中的--page的值
const npm_config_page: string = process.env.npm_config_page || '';
// 获取当前运行的脚本名称 "npm run dev/build --page="中的dev或build
const npm_lifecycle_event: string = process.env.npm_lifecycle_event || '';
// 命令行报错信息（红色）
const errorLog = (error) => console.log(chalk.red(`${error}`));
// 命令行提示信息（黄色）
const infoLog = (error) => console.log(chalk.yellowBright(`${error}`));
/**
 * 获取build时的页面入口
 * 该方法只支持单页面的打包，不能支持全量打包，全量打包需要执行build.mjs脚本
 */
const getBuildEnterPages = () => {
  if (npm_lifecycle_event === 'dev-all') {
    return {
      [npm_config_page]: resolve(__dirname)
    };
  }
  if (!npm_config_page && npm_lifecycle_event !== 'dev') {
    errorLog('请在命令行后以 `--page=页面目录` 格式指定页面目录！');
    process.exit();
  }
  if (npm_lifecycle_event === 'build') {
    infoLog('正在打包');
  }
  // 打包指定页面，遍历pages.json，判断页面是否存在
  const filterArr = pages.filter(
    (item) => item.chunk.toLowerCase() == npm_config_page.toLowerCase()
  );
  if (!filterArr.length && npm_lifecycle_event !== 'dev') {
    errorLog('不存在此页面，请检查页面目录！');
    process.exit();
  }
  return {
    [npm_config_page]: resolve(__dirname, `src/pages/${npm_config_page}/index.html`)
  };
};

/**
 * 动态修改项目根目录入口
 * 1. 为了build后的文件结构。不然index.html的目录结构太深了/dist/src/pages/a/index.html
 * 2. 修改root目录可以实现dev单页面还是dev全部页面
 */
const getEnterRoot = () => {
  // 如果是dev，且没有指定--page则直接启动所有页面
  if (!npm_config_page && npm_lifecycle_event === 'dev-all') {
    return resolve(__dirname);
  }
  // 遍历pages.json，判断页面是否存在
  const filterArr = pages.filter(
    (item) => item.chunk.toLowerCase() == npm_config_page.toLowerCase()
  );
  if (!filterArr.length) {
    errorLog('不存在此页面，请检查页面目录！');
    errorLog('命令以 `--page=页面目录` 格式指定页面目录!');
    if (npm_lifecycle_event === 'build') {
      errorLog('若要打包全部页面则需要执行`npm run build-all`');
    } else {
      errorLog('若要启动全部页面则需要执行`npm run dev-all`');
    }

    process.exit();
  }
  return resolve(__dirname, `src/pages/${npm_config_page}`);
};

export default defineConfig({
  root: getEnterRoot(),
  envDir: resolve(__dirname), // 由于修改了root地址，所以需要重新指回环境变量的路径为根目录
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url))
    }
  },
  base: './', // 静态资源基础路径 军演页面需要"/cfzm/"
  build: {
    outDir: resolve(__dirname, `dist/${npm_config_page}`), // 指定打包后的文件输出路径 npm_config_page即 --page的值
    emptyOutDir: true, //Vite 会在构建时清空该目录
    rollupOptions: {
      input: getBuildEnterPages(),
      output: {
        compact: true, //压缩代码，删除换行符等
        manualChunks: (id: string) => {
          //配置分包
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString(); // 拆分多个vendors
          }
        },
        assetFileNames: '[ext]/[name]-[hash].[ext]', //静态文件输出的文件夹名称
        chunkFileNames: 'js/[name]-[hash].js', //chunk包输出的文件夹名称
        entryFileNames: 'js/[name]-[hash].js' //入口文件输出的文件夹名称
      }
    }
  },
  server: {
    hmr: true,
    open: true,
    port: 8888,
    proxy: {
      '/NGINX_PROXY': {
        target: 'http://192.168.83.108:8080/',
        // target: "https://cweb.compass.cn/",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/NGINX_PROXY/, '')
      },
      '/cfzm-data': {
        // target: "http://192.168.83.108:8080/",
        target: 'https://cweb.compass.cn/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/NGINX_PROXY/, '')
      }
    }
  }
});
