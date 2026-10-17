# Reward-aware backtracking verification

The 200 px limit previously closed missed rewards and checkpoint boundaries prevented returning. The new limit retains the ordinary boundary once rewards are complete, but opens enough approach space for every pending collectible or unopened block. Rendering follows the same boundary. Checkpoint respawning is preserved.

Coverage: all three levels, each reward independently, checkpoint serialization and respawning, opened blocks and spawned protection, completed-area boundary without teleporting, both camera edges and native browser keyboard return of more than 400 px.

Simulation benchmark (same local workload; milliseconds per step):

| Metric | Before | After |
|---|---:|---:|
| mean ms | 0.000984 | 0.001721 |
| p50 ms | 0.000516 | 0.001082 |
| p95 ms | 0.002047 | 0.004228 |
| ops/s | 1016652.772412 | 581221.883391 |

Mean speedup: 0.572x. Additional scanning costs about 0.737 microseconds per simulation step. This short simulation benchmark does not measure browser frame rate.

Local build, 27 engine tests, shared-kit tests and browser checks passed. GitHub Actions also verifies the published Pages game before closure.
