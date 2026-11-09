/**
 * Code Wrapper Service
 * 
 * Wraps user's class/function-based solution code with driver code
 * that handles stdin/stdout I/O for Judge0 execution.
 * 
 * The user writes solutions as class methods (C++/Java/Python) or
 * standalone functions (JavaScript). This service adds:
 *   1. Necessary includes/imports
 *   2. Input parsing from stdin
 *   3. Solution function call
 *   4. Output formatting to stdout
 */

// ──────────────────────────────────────────────────────────────
// Main entry point
// ──────────────────────────────────────────────────────────────

export function wrapCode(userCode, language, driverMeta) {
  if (!driverMeta) return userCode

  // If user already wrote a main function, skip wrapping
  if (hasMainFunction(userCode, language)) return userCode

  switch (language) {
    case 'cpp':        return wrapCpp(userCode, driverMeta)
    case 'java':       return wrapJava(userCode, driverMeta)
    case 'python':     return wrapPython(userCode, driverMeta)
    case 'javascript': return wrapJavascript(userCode, driverMeta)
    default:           return userCode
  }
}

function hasMainFunction(code, language) {
  switch (language) {
    case 'cpp':        return /\bint\s+main\s*\(/.test(code)
    case 'java':       return /public\s+static\s+void\s+main\s*\(/.test(code)
    case 'python':     return /if\s+__name__\s*==\s*['"]__main__['"]/.test(code)
    case 'javascript': return /process\.stdin|require\s*\(\s*['"]readline['"]/.test(code)
    default:           return false
  }
}

// ──────────────────────────────────────────────────────────────
// C++ Wrapper
// ──────────────────────────────────────────────────────────────

function wrapCpp(userCode, meta) {
  const usesLinkedList = needsLinkedList(meta)
  const usesTree = needsTree(meta)

  const includes = `
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <algorithm>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <climits>
#include <cmath>
#include <iomanip>
#include <numeric>
using namespace std;
`.trim()

  // Parse helpers — always included
  const parseHelpers = `
vector<int> _parseIntArray(const string& s) {
    vector<int> res;
    if (s.size() <= 2) return res;
    string inner = s.substr(1, s.size()-2);
    if (inner.empty()) return res;
    stringstream ss(inner); string tok;
    while(getline(ss, tok, ',')) {
        while(!tok.empty() && tok[0]==' ') tok.erase(tok.begin());
        while(!tok.empty() && tok.back()==' ') tok.pop_back();
        if(!tok.empty()) res.push_back(stoi(tok));
    }
    return res;
}
vector<vector<int>> _parseInt2DArray(const string& s) {
    vector<vector<int>> res;
    if (s=="[]") return res;
    int depth=0; string num; vector<int> cur;
    for(char c:s){
        if(c=='['){depth++; if(depth==2){cur.clear();num.clear();}}
        else if(c==']'){
            if(depth==2){if(!num.empty()){cur.push_back(stoi(num));num.clear();}res.push_back(cur);}
            depth--;
        } else if(c==','){
            if(depth==2&&!num.empty()){cur.push_back(stoi(num));num.clear();}
        } else if(c!=' '&&c!='\\t') num+=c;
    }
    return res;
}
vector<string> _parseStringArray(const string& s) {
    vector<string> res;
    if (s.size()<=2) return res;
    size_t i=1;
    while(i<s.size()-1){
        if(s[i]=='"'){
            size_t j=i+1; string val;
            while(j<s.size()&&s[j]!='"'){
                if(s[j]=='\\\\'&&j+1<s.size()){val+=s[j+1];j+=2;}
                else{val+=s[j];j++;}
            }
            res.push_back(val); i=j+1;
            if(i<s.size()&&s[i]==',') i++;
        } else i++;
    }
    return res;
}
string _formatIntArray(const vector<int>& a){
    string r="["; for(size_t i=0;i<a.size();i++){if(i)r+=",";r+=to_string(a[i]);}return r+"]";
}
string _formatInt2DArray(const vector<vector<int>>& a){
    string r="["; for(size_t i=0;i<a.size();i++){if(i)r+=",";r+=_formatIntArray(a[i]);}return r+"]";
}
string _formatStringArray(const vector<string>& a){
    string r="["; for(size_t i=0;i<a.size();i++){if(i)r+=",";r+="\\""+a[i]+"\\\"";}return r+"]";
}
string _formatString2DArray(const vector<vector<string>>& a){
    string r="["; for(size_t i=0;i<a.size();i++){if(i)r+=",";r+=_formatStringArray(a[i]);}return r+"]";
}
`.trim()

  // LinkedList helpers — only if needed
  const llHelpers = usesLinkedList ? `
ListNode* _buildList(const vector<int>& a){
    if(a.empty()) return nullptr;
    ListNode* h=new ListNode(a[0]); ListNode* c=h;
    for(size_t i=1;i<a.size();i++){c->next=new ListNode(a[i]);c=c->next;}
    return h;
}
string _listToString(ListNode* h){
    string r="["; bool f=true;
    while(h){if(!f)r+=",";r+=to_string(h->val);f=false;h=h->next;}
    return r+"]";
}
`.trim() : ''

  // Tree helpers — only if needed
  const treeHelpers = usesTree ? `
TreeNode* _buildTree(const string& s){
    string t=s; while(!t.empty()&&(t[0]==' '||t[0]=='\\t'))t.erase(t.begin());
    while(!t.empty()&&(t.back()==' '||t.back()=='\\t'||t.back()=='\\r'))t.pop_back();
    if(t=="[]") return nullptr;
    string inner=t.substr(1,t.size()-2);
    vector<string> tokens; stringstream ss(inner); string tok;
    while(getline(ss,tok,',')){
        size_t a=tok.find_first_not_of(" \\t"), b=tok.find_last_not_of(" \\t");
        tokens.push_back(a!=string::npos?tok.substr(a,b-a+1):"");
    }
    if(tokens.empty()||tokens[0]=="null") return nullptr;
    TreeNode* root=new TreeNode(stoi(tokens[0]));
    queue<TreeNode*> q; q.push(root); size_t i=1;
    while(!q.empty()&&i<tokens.size()){
        TreeNode* n=q.front();q.pop();
        if(i<tokens.size()){if(tokens[i]!="null"&&!tokens[i].empty()){n->left=new TreeNode(stoi(tokens[i]));q.push(n->left);}i++;}
        if(i<tokens.size()){if(tokens[i]!="null"&&!tokens[i].empty()){n->right=new TreeNode(stoi(tokens[i]));q.push(n->right);}i++;}
    }
    return root;
}
string _treeToString(TreeNode* root){
    if(!root) return "[]";
    vector<string> toks; queue<TreeNode*> q; q.push(root);
    while(!q.empty()){TreeNode* n=q.front();q.pop();
        if(n){toks.push_back(to_string(n->val));q.push(n->left);q.push(n->right);}
        else toks.push_back("null");
    }
    while(!toks.empty()&&toks.back()=="null") toks.pop_back();
    string r="["; for(size_t i=0;i<toks.size();i++){if(i)r+=",";r+=toks[i];}return r+"]";
}
`.trim() : ''

  // Generate main()
  let mainBody = ''

  // Parse each parameter
  meta.params.forEach((p, idx) => {
    mainBody += cppParseParam(p.name, p.type, idx)
  })

  mainBody += '\n'

  // Call function and output result
  if (meta.isCodec) {
    mainBody += `    Codec codec;\n`
    mainBody += `    string _serialized = codec.serialize(${meta.params[0].name});\n`
    mainBody += `    TreeNode* _deserialized = codec.deserialize(_serialized);\n`
    mainBody += `    cout << _treeToString(_deserialized) << endl;\n`
  } else if (meta.returnType === 'void') {
    const args = meta.params.map(p => p.name).join(', ')
    mainBody += `    Solution _sol;\n`
    mainBody += `    _sol.${meta.functionName}(${args});\n`
    mainBody += cppFormatOutput(meta.inPlaceParam, meta.inPlaceType)
  } else {
    const args = meta.params.map(p => p.name).join(', ')
    const cppType = CPP_TYPE_MAP[meta.returnType] || 'auto'
    mainBody += `    Solution _sol;\n`
    mainBody += `    ${cppType} _result = _sol.${meta.functionName}(${args});\n`
    mainBody += cppFormatOutput('_result', meta.returnType)
  }

  return `${includes}

${userCode}

${parseHelpers}
${llHelpers}
${treeHelpers}

int main() {
${mainBody}    return 0;
}
`
}

const CPP_TYPE_MAP = {
  'int': 'int',
  'int[]': 'vector<int>',
  'int[][]': 'vector<vector<int>>',
  'string': 'string',
  'string[]': 'vector<string>',
  'string[][]': 'vector<vector<string>>',
  'bool': 'bool',
  'double': 'double',
  'LinkedList': 'ListNode*',
  'TreeNode': 'TreeNode*',
}

function cppParseParam(name, type, idx) {
  const lineVar = `_line${idx}`
  switch (type) {
    case 'int':
      return `    string ${lineVar}; getline(cin, ${lineVar});\n` +
             `    while(!${lineVar}.empty()&&(${lineVar}.back()=='\\r'||${lineVar}.back()=='\\n'))${lineVar}.pop_back();\n` +
             `    int ${name} = stoi(${lineVar});\n`
    case 'int[]':
      return `    string ${lineVar}; getline(cin, ${lineVar});\n` +
             `    vector<int> ${name} = _parseIntArray(${lineVar});\n`
    case 'int[][]':
      return `    string ${lineVar}; getline(cin, ${lineVar});\n` +
             `    vector<vector<int>> ${name} = _parseInt2DArray(${lineVar});\n`
    case 'string':
      return `    string ${name}; getline(cin, ${name});\n` +
             `    while(!${name}.empty()&&(${name}.back()=='\\r'||${name}.back()=='\\n'))${name}.pop_back();\n`
    case 'string[]':
      return `    string ${lineVar}; getline(cin, ${lineVar});\n` +
             `    vector<string> ${name} = _parseStringArray(${lineVar});\n`
    case 'LinkedList':
      return `    string ${lineVar}; getline(cin, ${lineVar});\n` +
             `    vector<int> _arr${idx} = _parseIntArray(${lineVar});\n` +
             `    ListNode* ${name} = _buildList(_arr${idx});\n`
    case 'LinkedList[]':
      return `    string ${lineVar}; getline(cin, ${lineVar});\n` +
             `    vector<vector<int>> _arrs${idx} = _parseInt2DArray(${lineVar});\n` +
             `    vector<ListNode*> ${name};\n` +
             `    for(auto& _a${idx} : _arrs${idx}) ${name}.push_back(_buildList(_a${idx}));\n`
    case 'TreeNode':
      return `    string ${lineVar}; getline(cin, ${lineVar});\n` +
             `    TreeNode* ${name} = _buildTree(${lineVar});\n`
    default:
      return `    string ${name}; getline(cin, ${name});\n`
  }
}

function cppFormatOutput(varName, type) {
  switch (type) {
    case 'int':        return `    cout << ${varName} << endl;\n`
    case 'bool':       return `    cout << (${varName} ? "true" : "false") << endl;\n`
    case 'double':     return `    cout << fixed << setprecision(5) << ${varName} << endl;\n`
    case 'int[]':      return `    cout << _formatIntArray(${varName}) << endl;\n`
    case 'int[][]':    return `    cout << _formatInt2DArray(${varName}) << endl;\n`
    case 'string':     return `    cout << ${varName} << endl;\n`
    case 'string[]':   return `    cout << _formatStringArray(${varName}) << endl;\n`
    case 'string[][]': return `    cout << _formatString2DArray(${varName}) << endl;\n`
    case 'LinkedList': return `    cout << _listToString(${varName}) << endl;\n`
    case 'TreeNode':   return `    cout << _treeToString(${varName}) << endl;\n`
    default:           return `    cout << ${varName} << endl;\n`
  }
}

// ──────────────────────────────────────────────────────────────
// Python Wrapper
// ──────────────────────────────────────────────────────────────

function wrapPython(userCode, meta) {
  const usesLinkedList = needsLinkedList(meta)
  const usesTree = needsTree(meta)

  // Lazy annotations keep modern hints like `list[int]` / `Optional[ListNode]` safe on any Python 3.7+.
  // A user-supplied __future__ import would be a SyntaxError once it's no longer first, so drop it.
  userCode = userCode.replace(/^\s*from\s+__future__\s+import\s+[^\n]*\n?/gm, '')
  let preCode = `from __future__ import annotations\nimport sys, json\nfrom typing import *\n`

  // Provide base class definitions in case user's code doesn't define them
  if (usesLinkedList) {
    preCode += `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
`
  }
  if (usesTree) {
    preCode += `
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
`
  }

  // Helper functions (after user code so user's class definitions take precedence)
  let helpers = `
def _formatResult(val):
    if isinstance(val, bool):
        return 'true' if val else 'false'
    elif isinstance(val, list):
        return '[' + ','.join(_formatResult(x) for x in val) + ']'
    elif isinstance(val, float):
        return f'{val:.5f}'
    elif isinstance(val, str):
        return '"' + val + '"'
    else:
        return str(val)
`

  if (usesLinkedList) {
    helpers += `
def _buildList(arr):
    if not arr: return None
    head = ListNode(arr[0]); curr = head
    for v in arr[1:]:
        curr.next = ListNode(v); curr = curr.next
    return head

def _listToArray(head):
    res = []
    while head: res.append(head.val); head = head.next
    return res
`
  }

  if (usesTree) {
    helpers += `
def _buildTree(arr):
    if not arr: return None
    root = TreeNode(arr[0])
    q = [root]; i = 1
    while q and i < len(arr):
        node = q.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i]); q.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i]); q.append(node.right)
        i += 1
    return root

def _treeToArray(root):
    if not root: return []
    res = []; q = [root]
    while q:
        node = q.pop(0)
        if node:
            res.append(node.val); q.append(node.left); q.append(node.right)
        else:
            res.append(None)
    while res and res[-1] is None: res.pop()
    return res

def _formatTree(root):
    arr = _treeToArray(root)
    if not arr: return '[]'
    parts = []
    for x in arr:
        parts.append('null' if x is None else str(x))
    return '[' + ','.join(parts) + ']'
`
  }

  // Driver code
  let driver = `
_input = sys.stdin.read().strip().split('\\n')
_idx = 0
def _readLine():
    global _idx
    line = _input[_idx].strip() if _idx < len(_input) else ''
    _idx += 1
    return line

`

  // Parse each param
  meta.params.forEach(p => {
    driver += pythonParseParam(p.name, p.type)
  })

  driver += '\n'

  // Call and output
  if (meta.isCodec) {
    driver += `_codec = Codec()\n`
    driver += `_serialized = _codec.serialize(${meta.params[0].name})\n`
    driver += `_deserialized = _codec.deserialize(_serialized)\n`
    driver += `print(_formatTree(_deserialized))\n`
  } else if (meta.returnType === 'void') {
    const args = meta.params.map(p => p.name).join(', ')
    driver += `_sol = Solution()\n`
    driver += `_sol.${meta.functionName}(${args})\n`
    driver += pythonFormatOutput(meta.inPlaceParam, meta.inPlaceType)
  } else {
    const args = meta.params.map(p => p.name).join(', ')
    driver += `_sol = Solution()\n`
    driver += `_result = _sol.${meta.functionName}(${args})\n`
    driver += pythonFormatOutput('_result', meta.returnType)
  }

  return `${preCode}\n${userCode}\n${helpers}\n${driver}`
}

function pythonParseParam(name, type) {
  switch (type) {
    case 'int':        return `${name} = int(_readLine())\n`
    case 'int[]':      return `${name} = json.loads(_readLine())\n`
    case 'int[][]':    return `${name} = json.loads(_readLine())\n`
    case 'string':     return `${name} = _readLine()\n`
    case 'string[]':   return `${name} = json.loads(_readLine())\n`
    case 'bool':       return `${name} = _readLine().lower() == 'true'\n`
    case 'double':     return `${name} = float(_readLine())\n`
    case 'LinkedList':  return `${name} = _buildList(json.loads(_readLine()))\n`
    case 'LinkedList[]': return `${name} = [_buildList(a) for a in json.loads(_readLine())]\n`
    case 'TreeNode': {
      return `_raw_${name} = _readLine()\n` +
             `_arr_${name} = json.loads(_raw_${name})\n` +  // JSON null -> None natively
             `${name} = _buildTree(_arr_${name})\n`
    }
    default:           return `${name} = _readLine()\n`
  }
}

function pythonFormatOutput(varName, type) {
  switch (type) {
    case 'int':        return `print(${varName})\n`
    case 'bool':       return `print('true' if ${varName} else 'false')\n`
    case 'double':     return `print(f'{${varName}:.5f}')\n`
    case 'int[]':      return `print(_formatResult(${varName}))\n`
    case 'int[][]':    return `print(_formatResult(${varName}))\n`
    case 'string':     return `print(${varName})\n`
    case 'string[]':   return `print(_formatResult(${varName}))\n`
    case 'string[][]': return `print(_formatResult(${varName}))\n`
    case 'LinkedList': return `print(_formatResult(_listToArray(${varName})))\n`
    case 'TreeNode':   return `print(_formatTree(${varName}))\n`
    default:           return `print(${varName})\n`
  }
}

// ──────────────────────────────────────────────────────────────
// Java Wrapper
// ──────────────────────────────────────────────────────────────

function wrapJava(userCode, meta) {
  const usesLinkedList = needsLinkedList(meta)
  const usesTree = needsTree(meta)

  const imports = `import java.util.*;\nimport java.io.*;\n`

  // Parse helper methods
  let helpers = `
    static int[] parseIntArray(String s) {
        s = s.trim();
        if (s.equals("[]")) return new int[0];
        s = s.substring(1, s.length()-1);
        String[] parts = s.split(",");
        int[] res = new int[parts.length];
        for (int i = 0; i < parts.length; i++) res[i] = Integer.parseInt(parts[i].trim());
        return res;
    }
    static int[][] parseInt2DArray(String s) {
        s = s.trim();
        if (s.equals("[]")) return new int[0][];
        List<int[]> list = new ArrayList<>();
        int depth = 0; StringBuilder num = new StringBuilder();
        List<Integer> cur = new ArrayList<>();
        for (char c : s.toCharArray()) {
            if (c == '[') { depth++; if (depth == 2) { cur.clear(); num.setLength(0); } }
            else if (c == ']') {
                if (depth == 2) {
                    if (num.length() > 0) { cur.add(Integer.parseInt(num.toString().trim())); num.setLength(0); }
                    int[] arr = new int[cur.size()]; for (int i = 0; i < cur.size(); i++) arr[i] = cur.get(i);
                    list.add(arr);
                } depth--;
            } else if (c == ',') {
                if (depth == 2 && num.length() > 0) { cur.add(Integer.parseInt(num.toString().trim())); num.setLength(0); }
            } else if (c != ' ' && c != '\\t') num.append(c);
        }
        return list.toArray(new int[0][]);
    }
    static String[] parseStringArray(String s) {
        s = s.trim();
        if (s.equals("[]")) return new String[0];
        List<String> res = new ArrayList<>();
        int i = 1;
        while (i < s.length() - 1) {
            if (s.charAt(i) == '"') {
                int j = i + 1; StringBuilder val = new StringBuilder();
                while (j < s.length() && s.charAt(j) != '"') { val.append(s.charAt(j)); j++; }
                res.add(val.toString()); i = j + 1;
                if (i < s.length() && s.charAt(i) == ',') i++;
            } else i++;
        }
        return res.toArray(new String[0]);
    }
    static String formatIntArray(int[] a) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
        sb.append("]"); return sb.toString();
    }
    static String formatInt2DArray(int[][] a) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(formatIntArray(a[i])); }
        sb.append("]"); return sb.toString();
    }
    @SuppressWarnings("unchecked")
    static String formatResult(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof Boolean) return ((Boolean) obj) ? "true" : "false";
        if (obj instanceof Integer) return obj.toString();
        if (obj instanceof Double) return String.format("%.5f", (Double) obj);
        if (obj instanceof int[]) return formatIntArray((int[]) obj);
        if (obj instanceof int[][]) return formatInt2DArray((int[][]) obj);
        if (obj instanceof String[]) {
            String[] arr = (String[]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < arr.length; i++) { if (i > 0) sb.append(","); sb.append("\\"").append(arr[i]).append("\\""); }
            sb.append("]"); return sb.toString();
        }
        if (obj instanceof List) return formatList((List<?>) obj);
        return obj.toString();
    }
    static String formatList(List<?> list) {
        if (list.isEmpty()) return "[]";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            Object item = list.get(i);
            if (item instanceof List) sb.append(formatList((List<?>) item));
            else if (item instanceof String) sb.append("\\"").append(item).append("\\"");
            else if (item instanceof Integer) sb.append(item);
            else sb.append(item);
        }
        sb.append("]"); return sb.toString();
    }
`

  if (usesLinkedList) {
    helpers += `
    static ListNode buildList(int[] a) {
        if (a.length == 0) return null;
        ListNode h = new ListNode(a[0]); ListNode c = h;
        for (int i = 1; i < a.length; i++) { c.next = new ListNode(a[i]); c = c.next; }
        return h;
    }
    static String listToString(ListNode h) {
        StringBuilder sb = new StringBuilder("["); boolean f = true;
        while (h != null) { if (!f) sb.append(","); sb.append(h.val); f = false; h = h.next; }
        sb.append("]"); return sb.toString();
    }
`
  }

  if (usesTree) {
    helpers += `
    static TreeNode buildTree(String s) {
        s = s.trim();
        if (s.equals("[]")) return null;
        String inner = s.substring(1, s.length()-1);
        String[] tokens = inner.split(",");
        for (int i = 0; i < tokens.length; i++) tokens[i] = tokens[i].trim();
        if (tokens.length == 0 || tokens[0].equals("null")) return null;
        TreeNode root = new TreeNode(Integer.parseInt(tokens[0]));
        Queue<TreeNode> q = new LinkedList<>(); q.add(root); int i = 1;
        while (!q.isEmpty() && i < tokens.length) {
            TreeNode node = q.poll();
            if (i < tokens.length) { if (!tokens[i].equals("null") && !tokens[i].isEmpty()) { node.left = new TreeNode(Integer.parseInt(tokens[i])); q.add(node.left); } i++; }
            if (i < tokens.length) { if (!tokens[i].equals("null") && !tokens[i].isEmpty()) { node.right = new TreeNode(Integer.parseInt(tokens[i])); q.add(node.right); } i++; }
        }
        return root;
    }
    static String treeToString(TreeNode root) {
        if (root == null) return "[]";
        List<String> toks = new ArrayList<>(); Queue<TreeNode> q = new LinkedList<>(); q.add(root);
        while (!q.isEmpty()) { TreeNode n = q.poll(); if (n != null) { toks.add(String.valueOf(n.val)); q.add(n.left); q.add(n.right); } else toks.add("null"); }
        while (!toks.isEmpty() && toks.get(toks.size()-1).equals("null")) toks.remove(toks.size()-1);
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < toks.size(); i++) { if (i > 0) sb.append(","); sb.append(toks.get(i)); }
        sb.append("]"); return sb.toString();
    }
`
  }

  // Generate main method body
  let mainBody = `        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n`

  meta.params.forEach((p, idx) => {
    mainBody += javaParseParam(p.name, p.type, idx)
  })

  mainBody += '\n'

  if (meta.isCodec) {
    mainBody += `        Codec codec = new Codec();\n`
    mainBody += `        String _serialized = codec.serialize(${meta.params[0].name});\n`
    mainBody += `        TreeNode _deserialized = codec.deserialize(_serialized);\n`
    mainBody += `        System.out.println(treeToString(_deserialized));\n`
  } else if (meta.returnType === 'void') {
    const args = meta.params.map(p => p.name).join(', ')
    mainBody += `        Solution sol = new Solution();\n`
    mainBody += `        sol.${meta.functionName}(${args});\n`
    mainBody += javaFormatOutput(meta.inPlaceParam, meta.inPlaceType)
  } else {
    const args = meta.params.map(p => p.name).join(', ')
    const javaType = meta.javaReturnType || JAVA_TYPE_MAP[meta.returnType] || 'Object'
    mainBody += `        Solution sol = new Solution();\n`
    mainBody += `        ${javaType} _result = sol.${meta.functionName}(${args});\n`
    mainBody += javaFormatOutput('_result', meta.returnType, meta.javaReturnType)
  }

  return `${imports}
${userCode}

public class Main {
${helpers}
    public static void main(String[] args) throws Exception {
${mainBody}    }
}
`
}

const JAVA_TYPE_MAP = {
  'int': 'int',
  'int[]': 'int[]',
  'int[][]': 'int[][]',
  'string': 'String',
  'string[]': 'String[]',
  'string[][]': 'List<List<String>>',
  'bool': 'boolean',
  'double': 'double',
  'LinkedList': 'ListNode',
  'TreeNode': 'TreeNode',
}

function javaParseParam(name, type, idx) {
  switch (type) {
    case 'int':
      return `        int ${name} = Integer.parseInt(br.readLine().trim());\n`
    case 'int[]':
      return `        int[] ${name} = parseIntArray(br.readLine());\n`
    case 'int[][]':
      return `        int[][] ${name} = parseInt2DArray(br.readLine());\n`
    case 'string':
      return `        String ${name} = br.readLine().trim();\n`
    case 'string[]':
      return `        String[] ${name} = parseStringArray(br.readLine());\n`
    case 'LinkedList':
      return `        ListNode ${name} = buildList(parseIntArray(br.readLine()));\n`
    case 'LinkedList[]':
      return `        int[][] _arrs${idx} = parseInt2DArray(br.readLine());\n` +
             `        ListNode[] ${name} = new ListNode[_arrs${idx}.length];\n` +
             `        for (int _i${idx} = 0; _i${idx} < _arrs${idx}.length; _i${idx}++) ${name}[_i${idx}] = buildList(_arrs${idx}[_i${idx}]);\n`
    case 'TreeNode':
      return `        TreeNode ${name} = buildTree(br.readLine());\n`
    default:
      return `        String ${name} = br.readLine().trim();\n`
  }
}

function javaFormatOutput(varName, type, javaReturnType) {
  if (javaReturnType) {
    // Use generic formatResult for List types
    if (javaReturnType.startsWith('List<')) {
      return `        System.out.println(formatList(${varName}));\n`
    }
  }
  switch (type) {
    case 'int':        return `        System.out.println(${varName});\n`
    case 'bool':       return `        System.out.println(${varName} ? "true" : "false");\n`
    case 'double':     return `        System.out.printf("%.5f%n", ${varName});\n`
    case 'int[]':      return `        System.out.println(formatIntArray(${varName}));\n`
    case 'int[][]':    return `        System.out.println(formatInt2DArray(${varName}));\n`
    case 'string':     return `        System.out.println(${varName});\n`
    case 'string[]':   return `        System.out.println(formatResult(${varName}));\n`
    case 'string[][]': return `        System.out.println(formatResult(${varName}));\n`
    case 'LinkedList': return `        System.out.println(listToString(${varName}));\n`
    case 'TreeNode':   return `        System.out.println(treeToString(${varName}));\n`
    default:           return `        System.out.println(${varName});\n`
  }
}

// ──────────────────────────────────────────────────────────────
// JavaScript Wrapper
// ──────────────────────────────────────────────────────────────

function wrapJavascript(userCode, meta) {
  const usesLinkedList = needsLinkedList(meta)
  const usesTree = needsTree(meta)

  // Helper functions for linked list / tree if not in starter code
  let preCode = ''
  // The user's starter code already defines ListNode/TreeNode constructors,
  // but if they removed them, we provide fallbacks
  if (usesLinkedList && !userCode.includes('function ListNode')) {
    preCode += `function ListNode(val, next) { this.val = (val===undefined ? 0 : val); this.next = (next===undefined ? null : next); }\n`
  }
  if (usesTree && !userCode.includes('function TreeNode')) {
    preCode += `function TreeNode(val, left, right) { this.val = (val===undefined ? 0 : val); this.left = (left===undefined ? null : left); this.right = (right===undefined ? null : right); }\n`
  }

  let helpers = ''
  if (usesLinkedList) {
    helpers += `
function _buildList(arr) {
  if (!arr || !arr.length) return null;
  let head = new ListNode(arr[0]), curr = head;
  for (let i = 1; i < arr.length; i++) { curr.next = new ListNode(arr[i]); curr = curr.next; }
  return head;
}
function _listToArray(head) {
  const res = []; while (head) { res.push(head.val); head = head.next; } return res;
}
`
  }
  if (usesTree) {
    helpers += `
function _buildTree(arr) {
  if (!arr || !arr.length) return null;
  const root = new TreeNode(arr[0]); const q = [root]; let i = 1;
  while (q.length && i < arr.length) {
    const node = q.shift();
    if (i < arr.length && arr[i] !== null) { node.left = new TreeNode(arr[i]); q.push(node.left); } i++;
    if (i < arr.length && arr[i] !== null) { node.right = new TreeNode(arr[i]); q.push(node.right); } i++;
  }
  return root;
}
function _treeToString(root) {
  if (!root) return '[]';
  const toks = [], q = [root];
  while (q.length) { const n = q.shift(); if (n) { toks.push(n.val); q.push(n.left); q.push(n.right); } else toks.push(null); }
  while (toks.length && toks[toks.length-1] === null) toks.pop();
  return '[' + toks.map(x => x === null ? 'null' : x).join(',') + ']';
}
`
  }

  // Driver code
  let driver = `
const _input = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');
let _idx = 0;
function _readLine() { return (_input[_idx++] || '').trim(); }

`

  // Parse params
  meta.params.forEach(p => {
    driver += jsParseParam(p.name, p.type)
  })

  driver += '\n'

  // In JS, functions are standalone (not class methods)
  if (meta.isCodec) {
    // Special handling for codec
    driver += `const _serialized = serialize(${meta.params[0].name});\n`
    driver += `const _deserialized = deserialize(_serialized);\n`
    driver += `console.log(_treeToString(_deserialized));\n`
  } else if (meta.returnType === 'void') {
    const args = meta.params.map(p => p.name).join(', ')
    driver += `${meta.functionName}(${args});\n`
    driver += jsFormatOutput(meta.inPlaceParam, meta.inPlaceType)
  } else {
    const args = meta.params.map(p => p.name).join(', ')
    driver += `const _result = ${meta.functionName}(${args});\n`
    driver += jsFormatOutput('_result', meta.returnType)
  }

  return `${preCode}\n${userCode}\n${helpers}\n${driver}`
}

function jsParseParam(name, type) {
  switch (type) {
    case 'int':         return `const ${name} = parseInt(_readLine());\n`
    case 'int[]':       return `const ${name} = JSON.parse(_readLine());\n`
    case 'int[][]':     return `const ${name} = JSON.parse(_readLine());\n`
    case 'string':      return `const ${name} = _readLine();\n`
    case 'string[]':    return `const ${name} = JSON.parse(_readLine());\n`
    case 'bool':        return `const ${name} = _readLine() === 'true';\n`
    case 'double':      return `const ${name} = parseFloat(_readLine());\n`
    case 'LinkedList':  return `const ${name} = _buildList(JSON.parse(_readLine()));\n`
    case 'LinkedList[]': return `const ${name} = JSON.parse(_readLine()).map(_buildList);\n`
    case 'TreeNode':    return `const ${name} = _buildTree(JSON.parse(_readLine()));\n`
    default:            return `const ${name} = _readLine();\n`
  }
}

function jsFormatOutput(varName, type) {
  switch (type) {
    case 'int':        return `console.log(${varName});\n`
    case 'bool':       return `console.log(${varName} ? 'true' : 'false');\n`
    case 'double':     return `console.log(${varName}.toFixed(5));\n`
    case 'int[]':      return `console.log(JSON.stringify(${varName}));\n`
    case 'int[][]':    return `console.log(JSON.stringify(${varName}));\n`
    case 'string':     return `console.log(${varName});\n`
    case 'string[]':   return `console.log(JSON.stringify(${varName}));\n`
    case 'string[][]': return `console.log(JSON.stringify(${varName}));\n`
    case 'LinkedList': return `console.log(JSON.stringify(_listToArray(${varName})));\n`
    case 'TreeNode':   return `console.log(_treeToString(${varName}));\n`
    default:           return `console.log(${varName});\n`
  }
}

// ──────────────────────────────────────────────────────────────
// Utility
// ──────────────────────────────────────────────────────────────

function needsLinkedList(meta) {
  const types = meta.params.map(p => p.type)
  if (meta.returnType) types.push(meta.returnType)
  return types.some(t => t === 'LinkedList' || t === 'LinkedList[]')
}

function needsTree(meta) {
  const types = meta.params.map(p => p.type)
  if (meta.returnType) types.push(meta.returnType)
  if (meta.isCodec) return true
  return types.some(t => t === 'TreeNode')
}

// ──────────────────────────────────────────────────────────────
// Output Comparison
// ──────────────────────────────────────────────────────────────

export function compareOutputs(actual, expected, returnType, orderIndependent = false) {
  if (!actual && !expected) return true
  if (!actual || !expected) return false

  const a = actual.trim()
  const e = expected.trim()

  // Direct match
  if (a === e) return true

  // Normalize whitespace around JSON structural chars
  const normalize = (s) => s.replace(/\s*([,\[\]{}])\s*/g, '$1').trim()
  if (normalize(a) === normalize(e)) return true

  // Floating point results: compare with tolerance (e.g. 2.5 vs 2.50000)
  if (returnType === 'double') {
    const x = Number(a), y = Number(e)
    if (Number.isFinite(x) && Number.isFinite(y)) return Math.abs(x - y) <= 1e-5 * Math.max(1, Math.abs(y))
    return false
  }

  // Booleans: Python prints True/False, others true/false
  if (returnType === 'bool') return a.toLowerCase() === e.toLowerCase()

  // For order-independent results (like 3Sum, Group Anagrams)
  if (orderIndependent && (returnType === 'int[][]' || returnType === 'string[][]')) {
    try {
      const aArr = JSON.parse(a)
      const eArr = JSON.parse(e)
      if (aArr.length !== eArr.length) return false

      const sortInner = (arr) => arr.map(inner =>
        [...inner].sort((x, y) => String(x).localeCompare(String(y)))
      ).sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)))

      return JSON.stringify(sortInner(aArr)) === JSON.stringify(sortInner(eArr))
    } catch {
      return false
    }
  }

  // For int[] where order might not matter (like Two Sum "return in any order")
  if (orderIndependent && returnType === 'int[]') {
    try {
      const aArr = JSON.parse(a)
      const eArr = JSON.parse(e)
      return JSON.stringify(aArr.sort()) === JSON.stringify(eArr.sort())
    } catch {
      return false
    }
  }

  return false
}
