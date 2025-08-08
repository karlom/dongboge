---
title: "brew updte出错解决方法记录"
description: "# brew updte出错解决方法记录 今天上午看到一个推说要brew更新，于是我也终于想起来要为安装的应用 [&hellip;]"
pubDate: "Jul 19, 2025"
tags: ["技术"]
heroImage: "../../assets/tech1.jpg"
slug: "fixing-brew-update-errors"
---

\# brew updte出错解决方法记录

今天上午看到一个推说要brew更新，于是我也终于想起来要为安装的应用更新一下版本，于是我就在屏幕上输入了

brew update

但是却跑出来一个报错：

fatal: couldn't find remote ref refs/heads/master

Error: Fetching /usr/local/Homebrew/Library/Taps/dart-lang/homebrew-dart failed!

Error: Some taps failed to update!

The following taps can not read their remote branches:

dart-lang/dart

This is happening because the remote branch was renamed or deleted.

Reset taps to point to the correct remote branches by running \`brew tap --repair\`

按提示应该是dart出了问题，访问不到git的地址了，于是先是做了修复：brew tap --repair，但是失败了。报下面的错：

fatal: couldn't find remote ref refs/heads/master

Error: Failure while executing; \`git -C /usr/local/Homebrew/Library/Taps/dart-lang/homebrew-dart fetch origin\` exited with 128.

虽然搜索到说是因为之前的电脑安装的是intel版的应用，现在是M1版的，可能不兼容，要打开终端的一个设置之类的，但是做了之后还是一样的问题。所以我就想应该重装就好，但是第一次在没有删除的前提下直接安装，是安装了最新版，但是更新brew的时候还是报一样的错，所以应该就是要先删除原来安装的版本才可以，于是想到它是用tap安装的，于是看了一下tap的用法，里面有一个untap的选项，于是就按这个来：

1、brew tap

2、找到dart的软件名：dart-lang/dart

3、brew untap dart-lang/dart

4、brew tap dart-lang/dart

5、brew install dart

至此就重新安装了dart了，重试了一下brew update，已经正常更新，dart也已经更新到最新版了。于是我就可以继续去搞我的记单词应用了^\_^
