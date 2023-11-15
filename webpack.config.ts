import path from 'path';
import { DefinePlugin, WebpackPluginInstance } from 'webpack';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';
import cssnano from 'cssnano';
import SentryCliPlugin from '@sentry/webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import { Configuration } from "webpack";
import "webpack-dev-server";

import { IS_DEV, WEBPACK_PORT } from './src/server/config';

const plugins: Array<WebpackPluginInstance> = [
    new WebpackManifestPlugin({}),
    new DefinePlugin({
        'process.env.PUBLIC_URL': JSON.stringify(process.env.PUBLIC_URL || '.'),
        'process.env.CAPROVER_GIT_COMMIT_SHA': JSON.stringify(process.env.CAPROVER_GIT_COMMIT_SHA || ""),
        'process.env.DEBUG_SERVER_COLOR': JSON.stringify(process.env.DEBUG_SERVER_COLOR || ""),
        'process.env.SENTRY_DSN': JSON.stringify(process.env.SENTRY_DSN || ""),
        'process.env.SENTRY_ENV': JSON.stringify(process.env.SENTRY_ENV || ""),
        'process.env.SKIP_CULLING_UNTIL_FIRST_RENDER': JSON.stringify(process.env.SKIP_CULLING_UNTIL_FIRST_RENDER || "1"),
        'process.env.NETWORK_DIAGNOSTICS_EXTERNAL_PING_URL': JSON.stringify(process.env.NETWORK_DIAGNOSTICS_EXTERNAL_PING_URL || ""),
        'process.env.DEFAULT_PLAYER_NAME': JSON.stringify(process.env.DEFAULT_PLAYER_NAME || ""),
        'process.env.CLIENT_FORCE_PRODUCTION_MODE': JSON.stringify(process.env.CLIENT_FORCE_PRODUCTION_MODE || "")
    })
    /*,
    new ProvidePlugin({
        PIXI: 'pixi.js'
    })
    */
];

// import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
// plugins.push(new BundleAnalyzerPlugin());

const sentryDSN = process.env.SENTRY_DSN;
const commitSHA = process.env.CAPROVER_GIT_COMMIT_SHA;
if (sentryDSN && commitSHA) {
    plugins.push(new SentryCliPlugin({
        include: "./dist",
        release: commitSHA,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT
    }));
}

const nodeModulesPath = path.resolve(__dirname, 'node_modules');

// Using '> 0.25%, not dead' would probably be better because it supports more browsers, but
// it leads to a significant drop (100% -> 66%) in framerate. Until we figure out why this is
// the case, keeping targets for the IS_DEV value is probably better - we'll see whether it leads
// to problems on any devices through testing. In general though, Chrome is supposed to be our
// only supported browser anyway.
//const targets = IS_DEV ? { chrome: '79', firefox: '72' } : '> 0.25%, not dead';
const targets = { chrome: '79', firefox: '72' };

// In production mode: Don't mangle function names that start with an uppercase letter (i.e. React components).
// At the time of writing adds 31 KiB to the main bundle and 63 KiB to the vendors bundle, but gives better
// stack traces for ErrorBoundary errors and shows correct component names in the Chrome React Developer Tools.
// Turned off for now as it seemed to have minimal positive impact as source maps seemed already enough and most
// of our components are "wrappedComponent" anway.
const keepFunctionalReactComponentNames = false;

const config: Configuration = {
    mode: IS_DEV ? 'development' : 'production',
    devtool: IS_DEV ? 'eval-cheap-module-source-map' : 'source-map',
    entry: ['./src/client/client'],
    output: {
        path: path.join(__dirname, 'dist', 'statics'),
        filename: `[name]-[chunkhash]-bundle.js`,
        chunkFilename: '[name]-[chunkhash]-bundle.js',
        publicPath: '/statics/',
    },
    resolve: {
        extensions: ['.js', '.ts', '.tsx'],
        alias: {
            "styled-components": path.resolve("node_modules", "styled-components"),
            'react-dom': '@hot-loader/react-dom',
        }
    },
    optimization: {
        minimize: !IS_DEV,
        minimizer: [
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
                    mangle: {
                        keep_fnames: keepFunctionalReactComponentNames ? /^[A-Z].*/ : undefined,
                    }
                },
            }),
        ],
        splitChunks: {
            cacheGroups: {
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                    priority: 10,
                },
                material: {
                    test: /[\\/]node_modules[\\/]@material-ui[\\/]/,
                    name: 'material-ui',
                    chunks: 'all',
                    priority: 20,
                },
            },
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: [/node_modules/, nodeModulesPath],
                use: [
                    'babel-inline-import-loader',
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [['@babel/env', { modules: false, targets }], '@babel/react', '@babel/typescript'],
                            plugins: [
                                'react-hot-loader/babel',
                                '@babel/proposal-numeric-separator',
                                '@babel/plugin-transform-runtime',
                                ['@babel/plugin-proposal-decorators', { legacy: true }],
                                ['@babel/plugin-proposal-class-properties', { loose: false }],
                                '@babel/plugin-proposal-object-rest-spread',
                                ['inline-import', { extensions: ['.frag', '.vert'] }],
                                'babel-plugin-styled-components'
                            ],
                        },
                    }
                ],
            },
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false,
                },
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: 'style-loader',
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: {
                                exportLocalsConvention: 'camelCase',
                            },
                            sourceMap: IS_DEV,
                        },
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: IS_DEV,
                            postcssOptions: {
                                plugins: IS_DEV ? [cssnano()] : [],
                            }
                        },
                    },
                ],
            },
            {
                test: /.jpe?g$|.gif$|.png$|.svg$|.woff$|.woff2$|.ttf$|.eot$/,
                use: 'url-loader?limit=10000',
            },
        ],
    },
    devServer: {
        port: WEBPACK_PORT,
        client: {
            overlay: IS_DEV
        }
    },
    plugins,
    watchOptions: {
        ignored: /node_modules/
    }
};

export default config;
