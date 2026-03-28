import { useState } from "react";

interface Props {
  onSubmit: (name: string) => Promise<void>;
  error: string;
}

export default function NicknameScreen({ onSubmit, error }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onSubmit(name.trim());
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm anim-slide-up">

        {/* Logo row */}
        <div className="flex items-center justify-center gap-5 mb-8">
          <span className="text-5xl font-black text-indigo-400 glow-x select-none">X</span>
          <h1 className="text-3xl font-black tracking-tight text-gradient">Tic Tac Toe</h1>
          <span className="text-5xl font-black text-pink-400 glow-o select-none">O</span>
        </div>

        {/* Card */}
        <div className="glass-md rounded-3xl p-8 space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-white text-xl font-bold">Choose your name</h2>
            <p className="text-white/35 text-sm">Other players will see this</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Enter nickname..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              autoFocus
              className="input-field w-full rounded-2xl px-5 py-4 text-sm"
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="btn-primary w-full rounded-2xl py-4 text-white font-semibold text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin inline-block" />
                  Saving...
                </span>
              ) : "Let's Play →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
