// Reference solutions written the way users write them (starter-code shape).
const CPP_LIST = `struct ListNode { int val; ListNode *next; ListNode() : val(0), next(nullptr) {} ListNode(int x) : val(x), next(nullptr) {} ListNode(int x, ListNode *next) : val(x), next(next) {} };\n`
const CPP_TREE = `struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode() : val(0), left(nullptr), right(nullptr) {} TreeNode(int x) : val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode *l, TreeNode *r) : val(x), left(l), right(r) {} };\n`
const JAVA_LIST = `class ListNode { int val; ListNode next; ListNode() {} ListNode(int val) { this.val = val; } ListNode(int val, ListNode next) { this.val = val; this.next = next; } }\n`
const JAVA_TREE = `class TreeNode { int val; TreeNode left; TreeNode right; TreeNode() {} TreeNode(int val) { this.val = val; } TreeNode(int val, TreeNode l, TreeNode r) { this.val = val; left = l; right = r; } }\n`
const PY_LIST = `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\n`
const PY_TREE = `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n`
const JS_LIST = `function ListNode(val, next) { this.val = (val === undefined ? 0 : val); this.next = (next === undefined ? null : next); }\n`
const JS_TREE = `function TreeNode(val, left, right) { this.val = (val === undefined ? 0 : val); this.left = (left === undefined ? null : left); this.right = (right === undefined ? null : right); }\n`

export const SOLUTIONS = {
  'two-sum': {
    cpp: `#include <vector>\n#include <unordered_map>\nusing namespace std;\nclass Solution { public: vector<int> twoSum(vector<int>& nums, int target) { unordered_map<int,int> m; for (int i=0;i<(int)nums.size();i++){ auto it=m.find(target-nums[i]); if(it!=m.end()) return {it->second,i}; m[nums[i]]=i;} return {}; } };`,
    java: `import java.util.*;\nclass Solution { public int[] twoSum(int[] nums, int target) { Map<Integer,Integer> m=new HashMap<>(); for(int i=0;i<nums.length;i++){ Integer j=m.get(target-nums[i]); if(j!=null) return new int[]{j,i}; m.put(nums[i],i);} return new int[0]; } }`,
    python: `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        seen = {}\n        for i, n in enumerate(nums):\n            if target - n in seen:\n                return [seen[target - n], i]\n            seen[n] = i\n        return []`,
    javascript: `function twoSum(nums, target) { const m = new Map(); for (let i = 0; i < nums.length; i++) { if (m.has(target - nums[i])) return [m.get(target - nums[i]), i]; m.set(nums[i], i); } return []; }`,
  },
  'reverse-linked-list': {
    cpp: CPP_LIST + `class Solution { public: ListNode* reverseList(ListNode* head) { ListNode* p=nullptr; while(head){ ListNode* n=head->next; head->next=p; p=head; head=n;} return p; } };`,
    java: JAVA_LIST + `class Solution { public ListNode reverseList(ListNode head) { ListNode p=null; while(head!=null){ ListNode n=head.next; head.next=p; p=head; head=n;} return p; } }`,
    python: PY_LIST + `class Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        prev = None\n        while head:\n            head.next, prev, head = prev, head, head.next\n        return prev`,
    javascript: JS_LIST + `function reverseList(head) { let p = null; while (head) { const n = head.next; head.next = p; p = head; head = n; } return p; }`,
  },
  'validate-bst': {
    cpp: CPP_TREE + `#include <climits>\nclass Solution { bool ok(TreeNode* n, long lo, long hi){ if(!n) return true; if(n->val<=lo||n->val>=hi) return false; return ok(n->left,lo,n->val)&&ok(n->right,n->val,hi);} public: bool isValidBST(TreeNode* root) { return ok(root, LONG_MIN, LONG_MAX); } };`,
    java: JAVA_TREE + `class Solution { boolean ok(TreeNode n, long lo, long hi){ if(n==null) return true; if(n.val<=lo||n.val>=hi) return false; return ok(n.left,lo,n.val)&&ok(n.right,n.val,hi);} public boolean isValidBST(TreeNode root) { return ok(root, Long.MIN_VALUE, Long.MAX_VALUE); } }`,
    python: PY_TREE + `class Solution:\n    def isValidBST(self, root: Optional[TreeNode]) -> bool:\n        def ok(n, lo, hi):\n            if not n: return True\n            if not (lo < n.val < hi): return False\n            return ok(n.left, lo, n.val) and ok(n.right, n.val, hi)\n        return ok(root, float('-inf'), float('inf'))`,
    javascript: JS_TREE + `function isValidBST(root) { const ok = (n, lo, hi) => !n || (n.val > lo && n.val < hi && ok(n.left, lo, n.val) && ok(n.right, n.val, hi)); return ok(root, -Infinity, Infinity); }`,
  },
  'rotate-image': {
    cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\nclass Solution { public: void rotate(vector<vector<int>>& m) { int n=m.size(); for(int i=0;i<n;i++) for(int j=i+1;j<n;j++) swap(m[i][j],m[j][i]); for(auto& r: m) reverse(r.begin(), r.end()); } };`,
    java: `class Solution { public void rotate(int[][] m) { int n=m.length; for(int i=0;i<n;i++) for(int j=i+1;j<n;j++){ int t=m[i][j]; m[i][j]=m[j][i]; m[j][i]=t;} for(int[] r: m) for(int i=0,j=n-1;i<j;i++,j--){ int t=r[i]; r[i]=r[j]; r[j]=t; } } }`,
    python: `class Solution:\n    def rotate(self, matrix: list[list[int]]) -> None:\n        matrix[:] = [list(r) for r in zip(*matrix[::-1])]`,
    javascript: `function rotate(m) { const n = m.length; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) [m[i][j], m[j][i]] = [m[j][i], m[i][j]]; m.forEach(r => r.reverse()); }`,
  },
  'median-of-two-sorted-arrays': {
    cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\nclass Solution { public: double findMedianSortedArrays(vector<int>& a, vector<int>& b) { vector<int> c(a); c.insert(c.end(), b.begin(), b.end()); sort(c.begin(), c.end()); int n=c.size(); return n%2 ? c[n/2] : (c[n/2-1]+c[n/2])/2.0; } };`,
    java: `import java.util.*;\nclass Solution { public double findMedianSortedArrays(int[] a, int[] b) { int[] c=new int[a.length+b.length]; System.arraycopy(a,0,c,0,a.length); System.arraycopy(b,0,c,a.length,b.length); Arrays.sort(c); int n=c.length; return n%2==1 ? c[n/2] : (c[n/2-1]+c[n/2])/2.0; } }`,
    python: `class Solution:\n    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:\n        c = sorted(nums1 + nums2)\n        n = len(c)\n        return float(c[n // 2]) if n % 2 else (c[n // 2 - 1] + c[n // 2]) / 2`,
    javascript: `function findMedianSortedArrays(a, b) { const c = [...a, ...b].sort((x, y) => x - y); const n = c.length; return n % 2 ? c[n >> 1] : (c[n / 2 - 1] + c[n / 2]) / 2; }`,
  },
  'group-anagrams': {
    cpp: `#include <vector>\n#include <string>\n#include <map>\n#include <algorithm>\nusing namespace std;\nclass Solution { public: vector<vector<string>> groupAnagrams(vector<string>& strs) { map<string, vector<string>> g; for (auto& s: strs) { string k=s; sort(k.begin(), k.end()); g[k].push_back(s);} vector<vector<string>> r; for (auto& [k,v]: g) r.push_back(v); return r; } };`,
    java: `import java.util.*;\nclass Solution { public List<List<String>> groupAnagrams(String[] strs) { Map<String, List<String>> g=new HashMap<>(); for(String s: strs){ char[] c=s.toCharArray(); Arrays.sort(c); g.computeIfAbsent(new String(c), k->new ArrayList<>()).add(s);} return new ArrayList<>(g.values()); } }`,
    python: `class Solution:\n    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:\n        g = {}\n        for s in strs:\n            g.setdefault(''.join(sorted(s)), []).append(s)\n        return list(g.values())`,
    javascript: `function groupAnagrams(strs) { const g = new Map(); for (const s of strs) { const k = [...s].sort().join(''); if (!g.has(k)) g.set(k, []); g.get(k).push(s); } return [...g.values()]; }`,
  },
}
