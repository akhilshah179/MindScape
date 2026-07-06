import { runTestCases } from './services/judge0Service.js';
import { getProblemById } from './services/problemsData.js';

const code = `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> mpp;
        int n = nums.size();
        for (int i = 0; i < n; i++) {
            int more = target - nums[i];
            if (mpp.find(more) != mpp.end()) {
                return {mpp[more], i};
            }
            mpp[nums[i]] = i;
        }
        return {};
    }
};`;

const problem = getProblemById('two-sum');

async function test() {
  try {
    const results = await runTestCases(code, 'cpp', problem.testCases, problem.timeLimit, problem.driverMeta);
    console.log("SUCCESS:", JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("ERROR:");
    console.error(err);
  }
}

test();
