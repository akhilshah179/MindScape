// ─── Coding Arena Problem Bank ───────────────────────────────────────────────
// 25 curated DSA problems: 8 Easy, 10 Medium, 7 Hard

export const problems = [
  // EASY (8)
  {
    id: 'two-sum', title: 'Two Sum', difficulty: 'Easy', category: 'Array',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9', 'Only one valid answer exists.'],
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]', explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].' }
    ],
    starterCode: {
      cpp: '// C++ Solution\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n        \n    }\n};',
      java: '// Java Solution\nimport java.util.*;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        \n    }\n}',
      python: '# Python Solution\nclass Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Write your solution here\n        pass',
      javascript: '// JavaScript Solution\nfunction twoSum(nums, target) {\n    // Write your solution here\n    \n}'
    },
    testCases: [
      { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' },
      { input: '[3,2,4]\n6', expectedOutput: '[1,2]' },
      { input: '[3,3]\n6', expectedOutput: '[0,1]' }
    ],
    driverMeta: {
      functionName: 'twoSum',
      params: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }],
      returnType: 'int[]',
      orderIndependent: true
    },
    timeLimit: 2000, memoryLimit: 256000
  },
  {
    id: 'palindrome-number', title: 'Palindrome Number', difficulty: 'Easy', category: 'Math',
    description: 'Given an integer x, return true if x is a palindrome, and false otherwise.\n\nAn integer is a palindrome when it reads the same forward and backward.',
    constraints: ['-2^31 <= x <= 2^31 - 1'],
    examples: [
      { input: 'x = 121', output: 'true', explanation: '121 reads as 121 from left to right and from right to left.' },
      { input: 'x = -121', output: 'false', explanation: 'From left to right, it reads -121. From right to left it becomes 121-.' },
      { input: 'x = 10', output: 'false', explanation: 'Reads 01 from right to left.' }
    ],
    starterCode: {
      cpp: '// C++ Solution\nclass Solution {\npublic:\n    bool isPalindrome(int x) {\n        // Write your solution here\n        \n    }\n};',
      java: '// Java Solution\nclass Solution {\n    public boolean isPalindrome(int x) {\n        // Write your solution here\n        \n    }\n}',
      python: '# Python Solution\nclass Solution:\n    def isPalindrome(self, x: int) -> bool:\n        # Write your solution here\n        pass',
      javascript: '// JavaScript Solution\nfunction isPalindrome(x) {\n    // Write your solution here\n    \n}'
    },
    testCases: [
      { input: '121', expectedOutput: 'true' },
      { input: '-121', expectedOutput: 'false' },
      { input: '10', expectedOutput: 'false' },
      { input: '0', expectedOutput: 'true' },
      { input: '12321', expectedOutput: 'true' }
    ],
    driverMeta: {
      functionName: 'isPalindrome',
      params: [{ name: 'x', type: 'int' }],
      returnType: 'bool'
    },
    timeLimit: 2000, memoryLimit: 256000
  },
  {
    id: 'valid-parentheses', title: 'Valid Parentheses', difficulty: 'Easy', category: 'Stack',
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    constraints: ['1 <= s.length <= 10^4', "s consists of parentheses only '()[]{}' ."],
    examples: [
      { input: 's = "()"', output: 'true', explanation: 'Valid.' },
      { input: 's = "()[]{}"', output: 'true', explanation: 'All three pairs are properly matched.' },
      { input: 's = "(]"', output: 'false', explanation: 'Mismatched.' }
    ],
    starterCode: {
      cpp: '// C++ Solution\n#include <string>\n#include <stack>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        // Write your solution here\n        \n    }\n};',
      java: '// Java Solution\nimport java.util.*;\n\nclass Solution {\n    public boolean isValid(String s) {\n        // Write your solution here\n        \n    }\n}',
      python: '# Python Solution\nclass Solution:\n    def isValid(self, s: str) -> bool:\n        # Write your solution here\n        pass',
      javascript: '// JavaScript Solution\nfunction isValid(s) {\n    // Write your solution here\n    \n}'
    },
    testCases: [
      { input: '()', expectedOutput: 'true' },
      { input: '()[]{}', expectedOutput: 'true' },
      { input: '(]', expectedOutput: 'false' },
      { input: '([)]', expectedOutput: 'false' },
      { input: '{[]}', expectedOutput: 'true' }
    ],
    driverMeta: {
      functionName: 'isValid',
      params: [{ name: 's', type: 'string' }],
      returnType: 'bool'
    },
    timeLimit: 2000, memoryLimit: 256000
  },
  {
    id: 'reverse-linked-list', title: 'Reverse Linked List', difficulty: 'Easy', category: 'LinkedList',
    description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
    constraints: ['The number of nodes in the list is the range [0, 5000].', '-5000 <= Node.val <= 5000'],
    examples: [
      { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]', explanation: '1->2->3->4->5 becomes 5->4->3->2->1.' },
      { input: 'head = [1,2]', output: '[2,1]', explanation: '1->2 becomes 2->1.' },
      { input: 'head = []', output: '[]', explanation: 'An empty list remains empty.' }
    ],
    starterCode: {
      cpp: '// C++ Solution\nstruct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Write your solution here\n        \n    }\n};',
      java: '// Java Solution\nclass ListNode {\n    int val;\n    ListNode next;\n    ListNode() {}\n    ListNode(int val) { this.val = val; }\n    ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n}\n\nclass Solution {\n    public ListNode reverseList(ListNode head) {\n        // Write your solution here\n        \n    }\n}',
      python: '# Python Solution\nclass ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\nclass Solution:\n    def reverseList(self, head: ListNode) -> ListNode:\n        # Write your solution here\n        pass',
      javascript: '// JavaScript Solution\nfunction ListNode(val, next) {\n    this.val = (val === undefined ? 0 : val);\n    this.next = (next === undefined ? null : next);\n}\n\nfunction reverseList(head) {\n    // Write your solution here\n    \n}'
    },
    testCases: [
      { input: '[1,2,3,4,5]', expectedOutput: '[5,4,3,2,1]' },
      { input: '[1,2]', expectedOutput: '[2,1]' },
      { input: '[]', expectedOutput: '[]' }
    ],
    driverMeta: {
      functionName: 'reverseList',
      params: [{ name: 'head', type: 'LinkedList' }],
      returnType: 'LinkedList'
    },
    timeLimit: 2000, memoryLimit: 256000
  },
  {
    id: 'maximum-subarray', title: 'Maximum Subarray', difficulty: 'Easy', category: 'Array',
    description: 'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
    constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    examples: [
      { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
      { input: 'nums = [1]', output: '1', explanation: 'The subarray [1] has the largest sum 1.' },
      { input: 'nums = [5,4,-1,7,8]', output: '23', explanation: 'The subarray [5,4,-1,7,8] has the largest sum 23.' }
    ],
    starterCode: {
      cpp: '// C++ Solution\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        // Write your solution here\n        \n    }\n};',
      java: '// Java Solution\nclass Solution {\n    public int maxSubArray(int[] nums) {\n        // Write your solution here\n        \n    }\n}',
      python: '# Python Solution\nclass Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        # Write your solution here\n        pass',
      javascript: '// JavaScript Solution\nfunction maxSubArray(nums) {\n    // Write your solution here\n    \n}'
    },
    testCases: [
      { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6' },
      { input: '[1]', expectedOutput: '1' },
      { input: '[5,4,-1,7,8]', expectedOutput: '23' },
      { input: '[-1]', expectedOutput: '-1' }
    ],
    driverMeta: {
      functionName: 'maxSubArray',
      params: [{ name: 'nums', type: 'int[]' }],
      returnType: 'int'
    },
    timeLimit: 2000, memoryLimit: 256000
  },
  {
    id: 'best-time-to-buy-and-sell-stock', title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', category: 'Array',
    description: 'You are given an array prices where prices[i] is the price of a given stock on the ith day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.',
    constraints: ['1 <= prices.length <= 10^5', '0 <= prices[i] <= 10^4'],
    examples: [
      { input: 'prices = [7,1,5,3,6,4]', output: '5', explanation: 'Buy on day 2 (price=1), sell on day 5 (price=6), profit=5.' },
      { input: 'prices = [7,6,4,3,1]', output: '0', explanation: 'No profitable transaction possible.' }
    ],
    starterCode: {
      cpp: '// C++ Solution\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        // Write your solution here\n        \n    }\n};',
      java: '// Java Solution\nclass Solution {\n    public int maxProfit(int[] prices) {\n        // Write your solution here\n        \n    }\n}',
      python: '# Python Solution\nclass Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        # Write your solution here\n        pass',
      javascript: '// JavaScript Solution\nfunction maxProfit(prices) {\n    // Write your solution here\n    \n}'
    },
    testCases: [
      { input: '[7,1,5,3,6,4]', expectedOutput: '5' },
      { input: '[7,6,4,3,1]', expectedOutput: '0' },
      { input: '[2,4,1]', expectedOutput: '2' },
      { input: '[1,2]', expectedOutput: '1' }
    ],
    driverMeta: {
      functionName: 'maxProfit',
      params: [{ name: 'prices', type: 'int[]' }],
      returnType: 'int'
    },
    timeLimit: 2000, memoryLimit: 256000
  },
  {
    id: 'merge-two-sorted-lists', title: 'Merge Two Sorted Lists', difficulty: 'Easy', category: 'LinkedList',
    description: 'You are given the heads of two sorted linked lists list1 and list2.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.',
    constraints: ['The number of nodes in both lists is in the range [0, 50].', '-100 <= Node.val <= 100', 'Both list1 and list2 are sorted in non-decreasing order.'],
    examples: [
      { input: 'list1 = [1,2,4], list2 = [1,3,4]', output: '[1,1,2,3,4,4]', explanation: 'Merging produces [1,1,2,3,4,4].' },
      { input: 'list1 = [], list2 = []', output: '[]', explanation: 'Both empty.' },
      { input: 'list1 = [], list2 = [0]', output: '[0]', explanation: 'Merging empty with [0] gives [0].' }
    ],
    starterCode: {
      cpp: '// C++ Solution\nstruct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\nclass Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n        // Write your solution here\n        \n    }\n};',
      java: '// Java Solution\nclass ListNode {\n    int val;\n    ListNode next;\n    ListNode() {}\n    ListNode(int val) { this.val = val; }\n    ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n}\n\nclass Solution {\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n        // Write your solution here\n        \n    }\n}',
      python: '# Python Solution\nclass ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\nclass Solution:\n    def mergeTwoLists(self, list1: ListNode, list2: ListNode) -> ListNode:\n        # Write your solution here\n        pass',
      javascript: '// JavaScript Solution\nfunction ListNode(val, next) {\n    this.val = (val === undefined ? 0 : val);\n    this.next = (next === undefined ? null : next);\n}\n\nfunction mergeTwoLists(list1, list2) {\n    // Write your solution here\n    \n}'
    },
    testCases: [
      { input: '[1,2,4]\n[1,3,4]', expectedOutput: '[1,1,2,3,4,4]' },
      { input: '[]\n[]', expectedOutput: '[]' },
      { input: '[]\n[0]', expectedOutput: '[0]' }
    ],
    driverMeta: {
      functionName: 'mergeTwoLists',
      params: [{ name: 'list1', type: 'LinkedList' }, { name: 'list2', type: 'LinkedList' }],
      returnType: 'LinkedList'
    },
    timeLimit: 2000, memoryLimit: 256000
  },
  {
    id: 'climbing-stairs', title: 'Climbing Stairs', difficulty: 'Easy', category: 'DP',
    description: 'You are climbing a staircase. It takes n steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    constraints: ['1 <= n <= 45'],
    examples: [
      { input: 'n = 2', output: '2', explanation: '1+1 or 2' },
      { input: 'n = 3', output: '3', explanation: '1+1+1, 1+2, 2+1' }
    ],
    starterCode: {
      cpp: '// C++ Solution\nclass Solution {\npublic:\n    int climbStairs(int n) {\n        // Write your solution here\n        \n    }\n};',
      java: '// Java Solution\nclass Solution {\n    public int climbStairs(int n) {\n        // Write your solution here\n        \n    }\n}',
      python: '# Python Solution\nclass Solution:\n    def climbStairs(self, n: int) -> int:\n        # Write your solution here\n        pass',
      javascript: '// JavaScript Solution\nfunction climbStairs(n) {\n    // Write your solution here\n    \n}'
    },
    testCases: [
      { input: '2', expectedOutput: '2' },
      { input: '3', expectedOutput: '3' },
      { input: '5', expectedOutput: '8' },
      { input: '10', expectedOutput: '89' }
    ],
    driverMeta: {
      functionName: 'climbStairs',
      params: [{ name: 'n', type: 'int' }],
      returnType: 'int'
    },
    timeLimit: 2000, memoryLimit: 256000
  },
  // MEDIUM (10)
  { id: 'longest-substring-without-repeating-characters', title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', category: 'String', description: 'Given a string s, find the length of the longest substring without repeating characters.', constraints: ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces.'], examples: [{ input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", length 3.' }, { input: 's = "bbbbb"', output: '1', explanation: 'The answer is "b", length 1.' }, { input: 's = "pwwkew"', output: '3', explanation: 'The answer is "wke", length 3.' }], starterCode: { cpp: '// C++ Solution\n#include <string>\n#include <unordered_set>\nusing namespace std;\n\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nimport java.util.*;\n\nclass Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction lengthOfLongestSubstring(s) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: 'abcabcbb', expectedOutput: '3' }, { input: 'bbbbb', expectedOutput: '1' }, { input: 'pwwkew', expectedOutput: '3' }, { input: '', expectedOutput: '0' }], driverMeta: { functionName: 'lengthOfLongestSubstring', params: [{ name: 's', type: 'string' }], returnType: 'int' }, timeLimit: 2000, memoryLimit: 256000 },
  { id: 'three-sum', title: '3Sum', difficulty: 'Medium', category: 'Array', description: 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.\n\nThe solution set must not contain duplicate triplets.', constraints: ['3 <= nums.length <= 3000', '-10^5 <= nums[i] <= 10^5'], examples: [{ input: 'nums = [-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]', explanation: 'Distinct triplets are [-1,-1,2] and [-1,0,1].' }, { input: 'nums = [0,1,1]', output: '[]', explanation: 'No triplet sums to 0.' }, { input: 'nums = [0,0,0]', output: '[[0,0,0]]', explanation: 'Only triplet sums to 0.' }], starterCode: { cpp: '// C++ Solution\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nimport java.util.*;\n\nclass Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def threeSum(self, nums: list[int]) -> list[list[int]]:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction threeSum(nums) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '[-1,0,1,2,-1,-4]', expectedOutput: '[[-1,-1,2],[-1,0,1]]' }, { input: '[0,1,1]', expectedOutput: '[]' }, { input: '[0,0,0]', expectedOutput: '[[0,0,0]]' }], driverMeta: { functionName: 'threeSum', params: [{ name: 'nums', type: 'int[]' }], returnType: 'int[][]', javaReturnType: 'List<List<Integer>>', orderIndependent: true }, timeLimit: 3000, memoryLimit: 256000 },
  { id: 'container-with-most-water', title: 'Container With Most Water', difficulty: 'Medium', category: 'Array', description: 'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.', constraints: ['n == height.length', '2 <= n <= 10^5', '0 <= height[i] <= 10^4'], examples: [{ input: 'height = [1,8,6,2,5,4,8,3,7]', output: '49', explanation: 'Lines at index 1 and 8, area = min(8,7)*(8-1) = 49.' }, { input: 'height = [1,1]', output: '1', explanation: 'Only container has area 1.' }], starterCode: { cpp: '// C++ Solution\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nclass Solution {\n    public int maxArea(int[] height) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def maxArea(self, height: list[int]) -> int:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction maxArea(height) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '[1,8,6,2,5,4,8,3,7]', expectedOutput: '49' }, { input: '[1,1]', expectedOutput: '1' }, { input: '[4,3,2,1,4]', expectedOutput: '16' }, { input: '[1,2,1]', expectedOutput: '2' }], driverMeta: { functionName: 'maxArea', params: [{ name: 'height', type: 'int[]' }], returnType: 'int' }, timeLimit: 2000, memoryLimit: 256000 },
  { id: 'group-anagrams', title: 'Group Anagrams', difficulty: 'Medium', category: 'String', description: 'Given an array of strings strs, group the anagrams together. You can return the answer in any order.', constraints: ['1 <= strs.length <= 10^4', '0 <= strs[i].length <= 100', 'strs[i] consists of lowercase English letters.'], examples: [{ input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]', explanation: 'Groups: ["eat","tea","ate"], ["tan","nat"], ["bat"].' }, { input: 'strs = [""]', output: '[[""]]', explanation: 'Single empty string.' }, { input: 'strs = ["a"]', output: '[["a"]]', explanation: 'Single character.' }], starterCode: { cpp: '// C++ Solution\n#include <vector>\n#include <string>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nimport java.util.*;\n\nclass Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction groupAnagrams(strs) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '["eat","tea","tan","ate","nat","bat"]', expectedOutput: '[["bat"],["nat","tan"],["ate","eat","tea"]]' }, { input: '[""]', expectedOutput: '[[""]]' }, { input: '["a"]', expectedOutput: '[["a"]]' }], driverMeta: { functionName: 'groupAnagrams', params: [{ name: 'strs', type: 'string[]' }], returnType: 'string[][]', javaReturnType: 'List<List<String>>', orderIndependent: true }, timeLimit: 2000, memoryLimit: 256000 },
  { id: 'binary-search', title: 'Binary Search', difficulty: 'Medium', category: 'Binary Search', description: 'Given a sorted array of integers nums and a target, write a function to search target in nums. If target exists return its index, otherwise return -1. You must write an algorithm with O(log n) runtime complexity.', constraints: ['1 <= nums.length <= 10^4', '-10^4 < nums[i], target < 10^4', 'All integers in nums are unique.', 'nums is sorted in ascending order.'], examples: [{ input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4', explanation: '9 is at index 4.' }, { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1', explanation: '2 not found.' }], starterCode: { cpp: '// C++ Solution\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nclass Solution {\n    public int search(int[] nums, int target) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction search(nums, target) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '[-1,0,3,5,9,12]\n9', expectedOutput: '4' }, { input: '[-1,0,3,5,9,12]\n2', expectedOutput: '-1' }, { input: '[5]\n5', expectedOutput: '0' }, { input: '[2,5]\n5', expectedOutput: '1' }], driverMeta: { functionName: 'search', params: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }], returnType: 'int' }, timeLimit: 2000, memoryLimit: 256000 },
  { id: 'coin-change', title: 'Coin Change', difficulty: 'Medium', category: 'DP', description: 'You are given an integer array coins representing coins of different denominations and an integer amount. Return the fewest number of coins needed to make up that amount. If not possible, return -1.', constraints: ['1 <= coins.length <= 12', '1 <= coins[i] <= 2^31 - 1', '0 <= amount <= 10^4'], examples: [{ input: 'coins = [1,5,10], amount = 12', output: '3', explanation: '12 = 10 + 1 + 1' }, { input: 'coins = [2], amount = 3', output: '-1', explanation: 'Impossible.' }, { input: 'coins = [1], amount = 0', output: '0', explanation: 'No coins needed.' }], starterCode: { cpp: '// C++ Solution\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nclass Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def coinChange(self, coins: list[int], amount: int) -> int:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction coinChange(coins, amount) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '[1,5,10]\n12', expectedOutput: '3' }, { input: '[2]\n3', expectedOutput: '-1' }, { input: '[1]\n0', expectedOutput: '0' }, { input: '[1,2,5]\n11', expectedOutput: '3' }], driverMeta: { functionName: 'coinChange', params: [{ name: 'coins', type: 'int[]' }, { name: 'amount', type: 'int' }], returnType: 'int' }, timeLimit: 2000, memoryLimit: 256000 },
  { id: 'rotate-image', title: 'Rotate Image', difficulty: 'Medium', category: 'Array', description: 'You are given an n x n 2D matrix representing an image. Rotate the image by 90 degrees clockwise in-place.', constraints: ['n == matrix.length == matrix[i].length', '1 <= n <= 20', '-1000 <= matrix[i][j] <= 1000'], examples: [{ input: 'matrix = [[1,2,3],[4,5,6],[7,8,9]]', output: '[[7,4,1],[8,5,2],[9,6,3]]', explanation: 'Rotated 90 degrees clockwise.' }, { input: 'matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]', output: '[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]', explanation: '4x4 rotated 90 degrees clockwise.' }], starterCode: { cpp: '// C++ Solution\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    void rotate(vector<vector<int>>& matrix) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nclass Solution {\n    public void rotate(int[][] matrix) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def rotate(self, matrix: list[list[int]]) -> None:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction rotate(matrix) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '[[1,2,3],[4,5,6],[7,8,9]]', expectedOutput: '[[7,4,1],[8,5,2],[9,6,3]]' }, { input: '[[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]', expectedOutput: '[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]' }, { input: '[[1]]', expectedOutput: '[[1]]' }], driverMeta: { functionName: 'rotate', params: [{ name: 'matrix', type: 'int[][]' }], returnType: 'void', inPlace: true, inPlaceParam: 'matrix', inPlaceType: 'int[][]' }, timeLimit: 2000, memoryLimit: 256000 },
  { id: 'product-of-array-except-self', title: 'Product of Array Except Self', difficulty: 'Medium', category: 'Array', description: 'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all elements of nums except nums[i]. You must write an O(n) algorithm without using division.', constraints: ['2 <= nums.length <= 10^5', '-30 <= nums[i] <= 30', 'The product of any prefix or suffix fits in a 32-bit integer.'], examples: [{ input: 'nums = [1,2,3,4]', output: '[24,12,8,6]', explanation: 'Products excluding each index.' }, { input: 'nums = [-1,1,0,-3,3]', output: '[0,0,9,0,0]', explanation: 'Zero makes all except index 2 equal 0.' }], starterCode: { cpp: '// C++ Solution\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nclass Solution {\n    public int[] productExceptSelf(int[] nums) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def productExceptSelf(self, nums: list[int]) -> list[int]:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction productExceptSelf(nums) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '[1,2,3,4]', expectedOutput: '[24,12,8,6]' }, { input: '[-1,1,0,-3,3]', expectedOutput: '[0,0,9,0,0]' }, { input: '[2,3]', expectedOutput: '[3,2]' }], driverMeta: { functionName: 'productExceptSelf', params: [{ name: 'nums', type: 'int[]' }], returnType: 'int[]' }, timeLimit: 2000, memoryLimit: 256000 },
  { id: 'validate-bst', title: 'Validate BST', difficulty: 'Medium', category: 'Tree', description: "Given the root of a binary tree, determine if it is a valid binary search tree (BST).\n\nA valid BST is defined as follows:\n- The left subtree contains only nodes with keys less than the node's key.\n- The right subtree contains only nodes with keys greater than the node's key.\n- Both subtrees must also be valid BSTs.", constraints: ['The number of nodes is in the range [1, 10^4].', '-2^31 <= Node.val <= 2^31 - 1'], examples: [{ input: 'root = [2,1,3]', output: 'true', explanation: 'Valid BST.' }, { input: 'root = [5,1,4,null,null,3,6]', output: 'false', explanation: 'Right child 4 < root 5.' }], starterCode: { cpp: '// C++ Solution\nstruct TreeNode {\n    int val;\n    TreeNode *left;\n    TreeNode *right;\n    TreeNode() : val(0), left(nullptr), right(nullptr) {}\n    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n};\n\nclass Solution {\npublic:\n    bool isValidBST(TreeNode* root) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nclass TreeNode {\n    int val;\n    TreeNode left;\n    TreeNode right;\n    TreeNode() {}\n    TreeNode(int val) { this.val = val; }\n    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }\n}\n\nclass Solution {\n    public boolean isValidBST(TreeNode root) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\nclass Solution:\n    def isValidBST(self, root: TreeNode) -> bool:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction TreeNode(val, left, right) {\n    this.val = (val === undefined ? 0 : val);\n    this.left = (left === undefined ? null : left);\n    this.right = (right === undefined ? null : right);\n}\n\nfunction isValidBST(root) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '[2,1,3]', expectedOutput: 'true' }, { input: '[5,1,4,null,null,3,6]', expectedOutput: 'false' }, { input: '[1]', expectedOutput: 'true' }, { input: '[5,4,6,null,null,3,7]', expectedOutput: 'false' }], driverMeta: { functionName: 'isValidBST', params: [{ name: 'root', type: 'TreeNode' }], returnType: 'bool' }, timeLimit: 2000, memoryLimit: 256000 },
  { id: 'kth-largest-element', title: 'Kth Largest Element', difficulty: 'Medium', category: 'Sorting', description: 'Given an integer array nums and an integer k, return the kth largest element in the array (sorted order, not distinct).', constraints: ['1 <= k <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'], examples: [{ input: 'nums = [3,2,1,5,6,4], k = 2', output: '5', explanation: '2nd largest is 5.' }, { input: 'nums = [3,2,3,1,2,4,5,5,6], k = 4', output: '4', explanation: '4th largest is 4.' }], starterCode: { cpp: '// C++ Solution\n#include <vector>\n#include <queue>\nusing namespace std;\n\nclass Solution {\npublic:\n    int findKthLargest(vector<int>& nums, int k) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nimport java.util.*;\n\nclass Solution {\n    public int findKthLargest(int[] nums, int k) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def findKthLargest(self, nums: list[int], k: int) -> int:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction findKthLargest(nums, k) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '[3,2,1,5,6,4]\n2', expectedOutput: '5' }, { input: '[3,2,3,1,2,4,5,5,6]\n4', expectedOutput: '4' }, { input: '[1]\n1', expectedOutput: '1' }], driverMeta: { functionName: 'findKthLargest', params: [{ name: 'nums', type: 'int[]' }, { name: 'k', type: 'int' }], returnType: 'int' }, timeLimit: 2000, memoryLimit: 256000 },
  // HARD (7)
  { id: 'median-of-two-sorted-arrays', title: 'Median of Two Sorted Arrays', difficulty: 'Hard', category: 'Binary Search', description: 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log(m+n)).', constraints: ['nums1.length == m', 'nums2.length == n', '0 <= m <= 1000', '0 <= n <= 1000', '1 <= m + n <= 2000', '-10^6 <= nums1[i], nums2[i] <= 10^6'], examples: [{ input: 'nums1 = [1,3], nums2 = [2]', output: '2.00000', explanation: 'Merged = [1,2,3], median = 2.' }, { input: 'nums1 = [1,2], nums2 = [3,4]', output: '2.50000', explanation: 'Merged = [1,2,3,4], median = 2.5.' }], starterCode: { cpp: '// C++ Solution\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nclass Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction findMedianSortedArrays(nums1, nums2) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '[1,3]\n[2]', expectedOutput: '2.00000' }, { input: '[1,2]\n[3,4]', expectedOutput: '2.50000' }, { input: '[0,0]\n[0,0]', expectedOutput: '0.00000' }, { input: '[]\n[1]', expectedOutput: '1.00000' }], driverMeta: { functionName: 'findMedianSortedArrays', params: [{ name: 'nums1', type: 'int[]' }, { name: 'nums2', type: 'int[]' }], returnType: 'double' }, timeLimit: 3000, memoryLimit: 256000 },
  { id: 'n-queens', title: 'N-Queens', difficulty: 'Hard', category: 'Array', description: "The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other. Given an integer n, return all distinct solutions.", constraints: ['1 <= n <= 9'], examples: [{ input: 'n = 4', output: '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]', explanation: 'Two solutions for 4-queens.' }, { input: 'n = 1', output: '[["Q"]]', explanation: 'One queen on 1x1 board.' }], starterCode: { cpp: '// C++ Solution\n#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<string>> solveNQueens(int n) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nimport java.util.*;\n\nclass Solution {\n    public List<List<String>> solveNQueens(int n) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def solveNQueens(self, n: int) -> list[list[str]]:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction solveNQueens(n) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '4', expectedOutput: '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]' }, { input: '1', expectedOutput: '[["Q"]]' }, { input: '2', expectedOutput: '[]' }], driverMeta: { functionName: 'solveNQueens', params: [{ name: 'n', type: 'int' }], returnType: 'string[][]', javaReturnType: 'List<List<String>>' }, timeLimit: 5000, memoryLimit: 256000 },
  { id: 'trapping-rain-water', title: 'Trapping Rain Water', difficulty: 'Hard', category: 'Array', description: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.', constraints: ['n == height.length', '1 <= n <= 2 * 10^4', '0 <= height[i] <= 10^5'], examples: [{ input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output: '6', explanation: 'Traps 6 units.' }, { input: 'height = [4,2,0,3,2,5]', output: '9', explanation: 'Traps 9 units.' }], starterCode: { cpp: '// C++ Solution\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int trap(vector<int>& height) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nclass Solution {\n    public int trap(int[] height) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def trap(self, height: list[int]) -> int:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction trap(height) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '[0,1,0,2,1,0,1,3,2,1,2,1]', expectedOutput: '6' }, { input: '[4,2,0,3,2,5]', expectedOutput: '9' }, { input: '[1,0,1]', expectedOutput: '1' }, { input: '[3,0,0,2,0,4]', expectedOutput: '10' }], driverMeta: { functionName: 'trap', params: [{ name: 'height', type: 'int[]' }], returnType: 'int' }, timeLimit: 2000, memoryLimit: 256000 },
  { id: 'merge-k-sorted-lists', title: 'Merge K Sorted Lists', difficulty: 'Hard', category: 'LinkedList', description: 'You are given an array of k linked-lists, each sorted in ascending order. Merge all into one sorted linked-list and return it.', constraints: ['k == lists.length', '0 <= k <= 10^4', '0 <= lists[i].length <= 500', '-10^4 <= lists[i][j] <= 10^4', 'lists[i] is sorted.', 'Sum of lists[i].length <= 10^4.'], examples: [{ input: 'lists = [[1,4,5],[1,3,4],[2,6]]', output: '[1,1,2,3,4,4,5,6]', explanation: 'Merged result.' }, { input: 'lists = []', output: '[]', explanation: 'No lists.' }, { input: 'lists = [[]]', output: '[]', explanation: 'Single empty list.' }], starterCode: { cpp: '// C++ Solution\n#include <vector>\n#include <queue>\nusing namespace std;\n\nstruct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\nclass Solution {\npublic:\n    ListNode* mergeKLists(vector<ListNode*>& lists) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nimport java.util.*;\n\nclass ListNode {\n    int val;\n    ListNode next;\n    ListNode() {}\n    ListNode(int val) { this.val = val; }\n    ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n}\n\nclass Solution {\n    public ListNode mergeKLists(ListNode[] lists) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\nclass Solution:\n    def mergeKLists(self, lists: list[ListNode]) -> ListNode:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction ListNode(val, next) {\n    this.val = (val === undefined ? 0 : val);\n    this.next = (next === undefined ? null : next);\n}\n\nfunction mergeKLists(lists) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '[[1,4,5],[1,3,4],[2,6]]', expectedOutput: '[1,1,2,3,4,4,5,6]' }, { input: '[]', expectedOutput: '[]' }, { input: '[[]]', expectedOutput: '[]' }], driverMeta: { functionName: 'mergeKLists', params: [{ name: 'lists', type: 'LinkedList[]' }], returnType: 'LinkedList' }, timeLimit: 3000, memoryLimit: 256000 },
  { id: 'word-ladder', title: 'Word Ladder', difficulty: 'Hard', category: 'Graph', description: 'A transformation sequence from beginWord to endWord using wordList where every adjacent pair differs by one letter. Return the number of words in the shortest transformation sequence, or 0 if none exists.', constraints: ['1 <= beginWord.length <= 10', 'endWord.length == beginWord.length', '1 <= wordList.length <= 5000', 'All words consist of lowercase English letters.', 'beginWord != endWord', 'All words in wordList are unique.'], examples: [{ input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]', output: '5', explanation: '"hit"->"hot"->"dot"->"dog"->"cog", 5 words.' }, { input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]', output: '0', explanation: '"cog" not in wordList.' }], starterCode: { cpp: '// C++ Solution\n#include <string>\n#include <vector>\n#include <queue>\n#include <unordered_set>\nusing namespace std;\n\nclass Solution {\npublic:\n    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nimport java.util.*;\n\nclass Solution {\n    public int ladderLength(String beginWord, String endWord, List<String> wordList) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def ladderLength(self, beginWord: str, endWord: str, wordList: list[str]) -> int:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction ladderLength(beginWord, endWord, wordList) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: 'hit\ncog\n["hot","dot","dog","lot","log","cog"]', expectedOutput: '5' }, { input: 'hit\ncog\n["hot","dot","dog","lot","log"]', expectedOutput: '0' }, { input: 'a\nc\n["a","b","c"]', expectedOutput: '2' }], driverMeta: { functionName: 'ladderLength', params: [{ name: 'beginWord', type: 'string' }, { name: 'endWord', type: 'string' }, { name: 'wordList', type: 'string[]' }], returnType: 'int', javaReturnType: 'int' }, timeLimit: 5000, memoryLimit: 256000 },
  { id: 'longest-valid-parentheses', title: 'Longest Valid Parentheses', difficulty: 'Hard', category: 'Stack', description: "Given a string containing just '(' and ')', return the length of the longest valid (well-formed) parentheses substring.", constraints: ['0 <= s.length <= 3 * 10^4', "s[i] is '(' or ')'."], examples: [{ input: 's = "(()"', output: '2', explanation: 'Longest valid is "()".' }, { input: 's = ")()())"', output: '4', explanation: 'Longest valid is "()()".' }, { input: 's = ""', output: '0', explanation: 'Empty.' }], starterCode: { cpp: '// C++ Solution\n#include <string>\n#include <stack>\nusing namespace std;\n\nclass Solution {\npublic:\n    int longestValidParentheses(string s) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nimport java.util.*;\n\nclass Solution {\n    public int longestValidParentheses(String s) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass Solution:\n    def longestValidParentheses(self, s: str) -> int:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction longestValidParentheses(s) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '(()', expectedOutput: '2' }, { input: ')()())', expectedOutput: '4' }, { input: '', expectedOutput: '0' }, { input: '()(())', expectedOutput: '6' }, { input: '()()', expectedOutput: '4' }], driverMeta: { functionName: 'longestValidParentheses', params: [{ name: 's', type: 'string' }], returnType: 'int' }, timeLimit: 2000, memoryLimit: 256000 },
  { id: 'serialize-and-deserialize-binary-tree', title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', category: 'Tree', description: 'Design an algorithm to serialize and deserialize a binary tree. Ensure a binary tree can be serialized to a string and deserialized back to the original tree structure.', constraints: ['The number of nodes is in the range [0, 10^4].', '-1000 <= Node.val <= 1000'], examples: [{ input: 'root = [1,2,3,null,null,4,5]', output: '[1,2,3,null,null,4,5]', explanation: 'Serialized and deserialized back.' }, { input: 'root = []', output: '[]', explanation: 'Empty tree.' }], starterCode: { cpp: '// C++ Solution\n#include <string>\n#include <sstream>\n#include <queue>\nusing namespace std;\n\nstruct TreeNode {\n    int val;\n    TreeNode *left;\n    TreeNode *right;\n    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n};\n\nclass Codec {\npublic:\n    string serialize(TreeNode* root) {\n        // Write your solution here\n        \n    }\n\n    TreeNode* deserialize(string data) {\n        // Write your solution here\n        \n    }\n};', java: '// Java Solution\nimport java.util.*;\n\nclass TreeNode {\n    int val;\n    TreeNode left;\n    TreeNode right;\n    TreeNode(int x) { val = x; }\n}\n\npublic class Codec {\n    public String serialize(TreeNode root) {\n        // Write your solution here\n        \n    }\n\n    public TreeNode deserialize(String data) {\n        // Write your solution here\n        \n    }\n}', python: '# Python Solution\nclass TreeNode:\n    def __init__(self, x):\n        self.val = x\n        self.left = None\n        self.right = None\n\nclass Codec:\n    def serialize(self, root: TreeNode) -> str:\n        # Write your solution here\n        pass\n\n    def deserialize(self, data: str) -> TreeNode:\n        # Write your solution here\n        pass', javascript: '// JavaScript Solution\nfunction TreeNode(val) {\n    this.val = val;\n    this.left = this.right = null;\n}\n\nfunction serialize(root) {\n    // Write your solution here\n    \n}\n\nfunction deserialize(data) {\n    // Write your solution here\n    \n}' }, testCases: [{ input: '[1,2,3,null,null,4,5]', expectedOutput: '[1,2,3,null,null,4,5]' }, { input: '[]', expectedOutput: '[]' }, { input: '[1]', expectedOutput: '[1]' }], driverMeta: { functionName: 'serialize', params: [{ name: 'root', type: 'TreeNode' }], returnType: 'TreeNode', isCodec: true }, timeLimit: 3000, memoryLimit: 256000 }
]

export const getProblems = (filters = {}) => {
  let result = [...problems]
  if (filters.difficulty) result = result.filter(p => p.difficulty.toLowerCase() === filters.difficulty.toLowerCase())
  if (filters.category) result = result.filter(p => p.category.toLowerCase() === filters.category.toLowerCase())
  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  }
  return result
}

export const getProblemById = (id) => problems.find(p => p.id === id)
