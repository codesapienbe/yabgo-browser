import { ChildProcessWithoutNullStreams } from 'child_process';

/**
 * Minimal transport that wraps an existing child process and exposes the stdio-based
 * transport interface expected by the MCP client. This allows the app to spawn and
 * supervise the child process itself while the MCP client communicates over the
 * child's stdin/stdout.
 */
export class SupervisedStdioTransport {
    private child: ChildProcessWithoutNullStreams;
    private buffer = '';

    // Event handlers used by MCP client
    public onmessage?: (msg: any) => void;
    public onclose?: () => void;
    public onerror?: (err: any) => void;

    constructor(child: ChildProcessWithoutNullStreams) {
        this.child = child;

        if (this.child.stdout) {
            this.child.stdout.on('data', (chunk: Buffer) => {
                this.buffer += chunk.toString('utf8');
                let idx: number;
                while ((idx = this.buffer.indexOf('\n')) !== -1) {
                    const line = this.buffer.slice(0, idx).replace(/\r$/, '');
                    this.buffer = this.buffer.slice(idx + 1);
                    try {
                        const parsed = JSON.parse(line);
                        this.onmessage?.(parsed);
                    } catch (err) {
                        this.onerror?.(err as Error);
                    }
                }
            });
        }

        this.child.on('error', (err) => {
            this.onerror?.(err);
        });

        this.child.on('close', () => {
            this.onclose?.();
        });
    }

    // Start is a no-op because the process is already spawned by supervisor
    public async start(): Promise<void> {
        return;
    }

    public async send(message: any): Promise<void> {
        if (!this.child.stdin) throw new Error('Not connected');
        const json = JSON.stringify(message) + '\n';
        return new Promise<void>((resolve, reject) => {
            if (this.child.stdin.write(json)) return resolve();
            this.child.stdin.once('drain', () => resolve());
            this.child.stdin.once('error', (err) => reject(err));
        });
    }

    public async close(): Promise<void> {
        try {
            if (!this.child.killed) {
                this.child.kill();
            }
        } catch (err) {
            // ignore
        }
    }

    public get stderr() {
        return this.child.stderr ?? null;
    }

    public get pid(): number | null {
        return this.child.pid ?? null;
    }
}

export default SupervisedStdioTransport;


