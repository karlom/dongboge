---
title: "使用 Gemini 3 从零构建 Agent 的实用指南"
description: "核心思想非常简单：它是一个在循环中运行的大语言模型（LLM），并被赋予可选择使用的工具。只要你会在 Python 中写一个循环，你就能构建一个 Agent。"
pubDate: "Nov 21, 2025"
tags: ["技术", "摘录"]
heroImage: "../../assets/tech.jpg"
---
# 使用 Gemini 3 从零构建 Agent 的实用指南

> 原文标题：Practical Guide on how to build an Agent from scratch with Gemini 3
>  译者：——
>  日期：2025-11-21
>  阅读时长：约 10 分钟

当你看到一个 AI 代理能编辑多个文件、运行命令、处理错误并迭代地解决问题，确实像魔法。但它并不神秘。构建代理的“秘密”在于：没有秘密。

核心思想非常简单：它是一个在循环中运行的大语言模型（LLM），并被赋予可选择使用的工具。

只要你会在 Python 中写一个循环，你就能构建一个 Agent。本指南将带你从一次基础 API 调用，逐步走到一个可工作的 CLI 代理。

------

## 目录

- 什么是 Agent
- “循环”（The Loop）的工作机制
- 构建一个 Agent
  - 步骤 1：基础文本生成与抽象
  - 步骤 2：赋予“手与眼”（工具使用）
  - 步骤 3：闭环（成为真正的 Agent）
  - 步骤 4：多轮 CLI 代理
- 工程最佳实践
  - 工具定义与人体工程学
  - 上下文工程
  - 不要过度设计
- 结语

------

## 什么是 Agent

传统软件工作流是规定性的，遵循预定义路径（Step A -> Step B -> Step C）。而 Agent 是一种使用 LLM 动态决定应用控制流程、以达成用户目标的系统。

一个 Agent 通常包含以下核心组件：

1. 模型（大脑）：推理引擎（这里是 Gemini 模型），负责在不确定中推理、规划步骤，并决定何时需要外部帮助。
2. 工具（手与眼）：代理可执行的函数，用来与外部世界/环境交互（如：搜索网页、读文件、调用 API）。
3. 上下文/记忆（工作区）：代理在任意时刻可访问的信息。有效的上下文管理也叫“上下文工程”（Context Engineering）。
4. 循环（生命）：一个 while 循环，让模型执行“观察 → 思考 → 行动 → 再观察”，直到任务完成。

------

## “循环”（The Loop）的工作机制

几乎所有 Agent 的“循环”都是迭代过程：

1. 定义工具：用结构化 JSON 格式向模型描述可用工具（如 `get_weather`）。
2. 调用 LLM：把用户提示和工具定义一并发给模型。
3. 模型决策：模型分析请求。如果需要工具，会返回一个结构化的“工具调用”（包含工具名和参数）。
4. 执行工具（客户端职责）：客户端/应用代码拦截工具调用，真正执行代码或 API，并拿到结果。
5. 响应并继续：把“工具响应”再发回模型。模型据此决定下一步（继续调用工具或生成最终回答）。

------

## 构建一个 Agent

以下用 Gemini 3 Pro + Python SDK，逐步构建一个功能性的 CLI 代理。

前提条件：

- 安装 SDK：`pip install google-genai`
- 设置环境变量：`GEMINI_API_KEY`（在 AI Studio 获取）

### 步骤 1：基础文本生成与抽象

首先，与 LLM 建立一个基础交互，并创建一个简单的 Agent 类来维护会话历史（先从一个“聊天机器人”开始）。

```python
from google import genai  
from google.genai import types  
  
class Agent:  
    def __init__(self, model: str):  
        self.model = model  
        self.client = genai.Client()  
        self.contents = []  
  
    def run(self, contents: str):  
        self.contents.append({"role": "user", "parts": [{"text": contents}]})  
        response = self.client.models.generate_content(model=self.model, contents=self.contents)  
        self.contents.append(response.candidates[0].content)  
        return response  
  
agent = Agent(model="gemini-3-pro-preview")  
response1 = agent.run(  
    contents="Hello, What are top 3 cities in Germany to visit? Only return the names of the cities."  
)  
print(f"Model: {response1.text}")  
# 输出示例：Berlin, Munich, Cologne  
  
response2 = agent.run(  
    contents="Tell me something about the second city."  
)  
print(f"Model: {response2.text}")  
# 输出示例：Munich is the capital of Bavaria and is known for its Oktoberfest.  
```

此时它还不是 Agent，只是一个维护状态的聊天机器人：能对话，但不能“行动”。

------

### 步骤 2：赋予“手与眼”（工具使用）

要把聊天机器人进化为 Agent，我们需要“工具使用”（Function Calling）。你需要提供工具的实现（Python 代码）和定义（LLM 可读的 schema）。当模型判断工具有助于解决问题时，会返回结构化的工具调用请求，而不仅是文本。

我们先创建 3 个工具：`read_file`、`write_file`、`list_dir`。工具定义用 JSON schema 描述工具的 `name`、`description` 与 `parameters`。

最佳实践：在 `description` 中清晰说明“何时/如何”使用工具。模型高度依赖这些解释。

```python
import os  
import json  
  
read_file_definition = {  
    "name": "read_file",  
    "description": "Reads a file and returns its contents.",  
    "parameters": {  
        "type": "object",  
        "properties": {  
            "file_path": {  
                "type": "string",  
                "description": "Path to the file to read.",  
            }  
        },  
        "required": ["file_path"],  
    },  
}  
  
list_dir_definition = {  
    "name": "list_dir",  
    "description": "Lists the contents of a directory.",  
    "parameters": {  
        "type": "object",  
        "properties": {  
            "directory_path": {  
                "type": "string",  
                "description": "Path to the directory to list.",  
            }  
        },  
        "required": ["directory_path"],  
    },  
}  
  
write_file_definition = {  
    "name": "write_file",  
    "description": "Writes a file with the given contents.",  
    "parameters": {  
        "type": "object",  
        "properties": {  
            "file_path": {  
                "type": "string",  
                "description": "Path to the file to write.",  
            },  
            "contents": {  
                "type": "string",  
                "description": "Contents to write to the file.",  
            },  
        },  
        "required": ["file_path", "contents"],  
    },  
}  
  
def read_file(file_path: str) -> dict:  
    with open(file_path, "r") as f:  
        return f.read()  
  
def write_file(file_path: str, contents: str) -> bool:  
    """Writes a file with the given contents."""  
    with open(file_path, "w") as f:  
        f.write(contents)  
    return True  
  
def list_dir(directory_path: str) -> list[str]:  
    """Lists the contents of a directory."""  
    full_path = os.path.expanduser(directory_path)  
    return os.listdir(full_path)  
  
file_tools = {  
    "read_file": {"definition": read_file_definition, "function": read_file},  
    "write_file": {"definition": write_file_definition, "function": write_file},  
    "list_dir": {"definition": list_dir_definition, "function": list_dir},  
}  
```

把工具集成到 Agent：

```python
from google import genai  
from google.genai import types  
  
class Agent:  
    def __init__(self, model: str, tools: list[dict]):  
        self.model = model  
        self.client = genai.Client()  
        self.contents = []  
        self.tools = tools  
  
    def run(self, contents: str):  
        self.contents.append({"role": "user", "parts": [{"text": contents}]})  
        config = types.GenerateContentConfig(  
            tools=[types.Tool(function_declarations=[tool["definition"] for tool in self.tools.values()])],  
        )  
        response = self.client.models.generate_content(model=self.model, contents=self.contents, config=config)  
        self.contents.append(response.candidates[0].content)  
        return response  
  
agent = Agent(model="gemini-3-pro-preview", tools=file_tools)  
response = agent.run(contents="Can you list my files in the current directory?")  
print(response.function_calls)  
# 输出示例： [FunctionCall(name='list_dir', arguments={'directory_path': '.'})]  
```

模型能成功提出工具调用了。接下来需要在 Agent 中加入执行工具的逻辑，并把结果回传给模型，形成闭环。

------

### 步骤 3：闭环（成为真正的 Agent）

一个 Agent 的关键不在于“能调用一次工具”，而是能在一次次工具调用之间循环：拦截工具调用、在客户端执行、拿到结果并回传，再让模型基于新信息决定下一步，直到任务完成。

为此，Agent 类中要处理：

- 拦截 FunctionCall
- 执行客户端工具
- 将 FunctionResponse 回传模型
- 必要的 System Instruction（系统指令）用于行为约束与风格引导

注：Gemini 3 使用“思维签名”（Thought signatures）在多次 API 调用中维持推理上下文。你必须原样把这些签名返回给模型。

```python
# ... 上文步骤 2 的工具与定义 ...  
  
from google import genai  
from google.genai import types  
  
class Agent:  
    def __init__(self, model: str, tools: list[dict], system_instruction: str = "You are a helpful assistant."):  
        self.model = model  
        self.client = genai.Client()  
        self.contents = []  
        self.tools = tools  
        self.system_instruction = system_instruction  
  
    def run(self, contents: str | list[dict[str, str]]):  
        if isinstance(contents, list):  
            self.contents.append({"role": "user", "parts": contents})  
        else:  
            self.contents.append({"role": "user", "parts": [{"text": contents}]})  
  
        config = types.GenerateContentConfig(  
            system_instruction=self.system_instruction,  
            tools=[types.Tool(function_declarations=[tool["definition"] for tool in self.tools.values()])],  
        )  
  
        response = self.client.models.generate_content(model=self.model, contents=self.contents, config=config)  
        self.contents.append(response.candidates[0].content)  
  
        if response.function_calls:  
            functions_response_parts = []  
            for tool_call in response.function_calls:  
                print(f"[Function Call] {tool_call}")  
                if tool_call.name in self.tools:  
                    result = {"result": self.tools[tool_call.name]["function"](**tool_call.args)}  
                else:  
                    result = {"error": "Tool not found"}  
                print(f"[Function Response] {result}")  
                functions_response_parts.append({"functionResponse": {"name": tool_call.name, "response": result}})  
  
            return self.run(functions_response_parts)  
  
        return response  
  
agent = Agent(  
    model="gemini-3-pro-preview",  
    tools=file_tools,  
    system_instruction="You are a helpful Coding Assistant. Respond like you are Linus Torvalds.",  
)  
  
response = agent.run(contents="Can you list my files in the current directory?")  
print(response.text)  
# 运行示例：  
# [Function Call] id=None args={'directory_path': '.'} name='list_dir'  
# [Function Response] {'result': ['.venv', ... ]}  
# There. Your current directory contains: `LICENSE`, ...  
```

恭喜，你已经构建了一个能自我闭环的 Agent 原型。

------

### 步骤 4：多轮 CLI 代理

现在用一个简易的 CLI 循环跑起来。很少的代码就能实现高能力的行为。

```python
# ... 上文步骤 3 的 Agent / 工具 / 定义 ...  
  
agent = Agent(  
    model="gemini-3-pro-preview",  
    tools=file_tools,  
    system_instruction="You are a helpful Coding Assistant. Respond like you are Linus Torvalds.",  
)  
  
print("Agent ready. Ask it to check files in this directory.")  
while True:  
    user_input = input("You: ")  
    if user_input.lower() in ['exit', 'quit']:  
        break  
    response = agent.run(user_input)  
    print(f"Linus: {response.text}\n")  
```

------

## 工程最佳实践

构建“循环”并不难；让它可靠、透明、可控才是挑战。以下是按功能领域归纳的关键实践。

### 1. 工具定义与人体工程学

- 清晰命名：用直观名字（`search_customer_database`），别用晦涩内部名（`cust_db_v2_query`）。
- 精准描述：模型会读函数 docstring 来理解何时/如何使用工具；认真写好描述，等同于“工具的提示工程”。
- 返回有意义的错误：别把 50 行堆栈回给模型。失败时给清楚的字符串错误，如 `Error: File not found. Did you mean 'data.csv'?`，帮助模型自我纠正。
- 容忍模糊输入：若模型常猜错路径，就让工具支持相对路径或模糊匹配，而不是直接报错。

### 2. 上下文工程

- 不要“倒数据”：避免返回整张 10MB 表。用 `search_users(query: str)` 替代 `get_all_users()`。
- 及时加载（Just-in-time）：别预加载所有数据（传统 RAG）。让代理维护轻量标识符（路径、ID），按需用工具动态加载。
- 压缩：长会话中对历史进行总结、清理旧上下文，或开启新会话。
- 代理式记忆：允许在上下文窗之外维护笔记/草稿，仅在相关时再拉回。

### 3. 不要过度设计

- 先最大化单个 Agent：别一开始就上复杂多 Agent 系统。Gemini 能在一个提示中使用几十个工具。
- 逃生通道：加 `max_iterations` 等机制（如 15 轮）以强制停止循环。
- 护栏与系统指令：用 `system_instruction` 设定硬规则（如“严禁退款超过 $50”），或配合外部分类器。
- 人在回路：对敏感动作（如 `send_email`、`execute_code`）先暂停循环，要求用户确认再执行。
- 透明与调试优先：记录工具调用与参数。分析模型的推理有助于定位问题并持续改进。

------

## 结语

构建 Agent 不再是魔法，而是务实的工程。你可以在不足 100 行代码内做出可工作的原型。理解这些基础很重要，但别一直重复造同一模式的轮子。社区已有优秀的开源库，能帮助你更快地构建更复杂、健壮的 Agent。

如有问题或反馈，欢迎在 Twitter 或 LinkedIn 联系作者。