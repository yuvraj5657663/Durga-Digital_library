# Load Testing Guide

## Node.js Load Test (Recommended for Windows)

The project includes a Node.js-based load test that works reliably on Windows without requiring k6 installation.

### Running the Node.js Load Test
```bash
cd k6
node load-test-node.js
```

### With Custom API URL
```bash
cd k6
set API_URL=http://localhost:3000
node load-test-node.js
```

### Load Test Configuration
- **Total Requests**: 50
- **Concurrent Requests**: 5
- **Test Duration**: ~10 seconds
- **Thresholds**: 95% success rate, 95th percentile < 1000ms

### Test Results
The Node.js load test provides:
- Success/failure rate
- Average response time
- Min/max response times
- 95th percentile
- Pass/fail determination

## K6 Load Test (Production/AWS)

For production environments or AWS deployments, k6 is recommended for more advanced load testing.

### Installation

#### Windows Installation

**Option 1: Chocolatey (Recommended)**
```powershell
choco install k6
```

**Option 2: Download Binary**
1. Download from: https://k6.io/
2. Extract to a folder (e.g., C:\k6)
3. Add to PATH: `setx PATH "%PATH%;C:\k6"`
4. Restart terminal

**Option 3: Scoop**
```powershell
scoop install k6
```

#### Linux Installation
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E34C5A
sudo chmod 644 /usr/share/keyrings/k6-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update
sudo apt install k6

# Or using Homebrew
brew install k6
```

### Running K6 Load Test
```bash
cd k6
k6 run load-test.js
```

### With Custom API URL
```bash
cd k6
set API_URL=http://localhost:3000
k6 run load-test.js
```

### K6 Configuration
- **Duration**: ~1 minute
- **Users**: 1 → 5 → 10
- **Thresholds**: 95th percentile < 2000ms, error rate < 20%
- **Endpoints Tested**:
  - `/health` - Health check

## Comparison

| Feature | Node.js Test | K6 Test |
|---------|-------------|---------|
| Installation | No installation required | Requires k6 installation |
| Windows Support | Excellent | May have networking issues |
| Features | Basic load testing | Advanced scenarios, metrics |
| CI/CD Integration | Simple | Industry standard |
| Reporting | Basic | Comprehensive |

## Recommendation

- **Development/Windows**: Use Node.js load test (`node load-test-node.js`)
- **Production/AWS**: Use k6 for comprehensive load testing (`k6 run load-test.js`)
- **CI/CD**: Use k6 for automated load testing in pipelines
