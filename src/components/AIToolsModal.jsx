import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { callAI, extractJson, MissingApiKeyError } from '../utils/aiClient.js'
import {
  buildOptimizePrompt,
  buildNutritionPrompt,
  parseOptimizeResponse,
  parseNutritionResponse,
  mergeStats,
  normalizeStatLabel,
  diffIngredients,
} from '../utils/recipeAI.js'

const GOALS = ['Lower carb', 'Higher protein', 'Keto', 'Vegan', 'Vegetarian', 'Low calorie', 'Gluten-free']

const API_KEY_MSG =
  'Add your Gemini API key in Profile → AI to use this feature. ' +
  'Gemini has a free tier — get a key at aistudio.google.com.'

// mode: 'optimize' | 'nutrition'
export default function AIToolsModal({ mode, recipe, settings, onApply, onClose, onOpenAISettings }) {
  const isOptimize = mode === 'optimize'
  const [step, setStep] = useState(isOptimize ? 'goal' : 'loading') // goal | loading | review | error
  const [goal, setGoal] = useState(null)
  const [customGoal, setCustomGoal] = useState('')
  const [error, setError] = useState('')
  const [needsKey, setNeedsKey] = useState(false)
  const [result, setResult] = useState(null)
  const requestId = useRef(0)
  const abortRef = useRef(null)

  function handleClose() {
    if (abortRef.current) abortRef.current.abort()
    onClose()
  }

  async function run(prompt, parse) {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const id = ++requestId.current
    setError('')
    setNeedsKey(false)
    setStep('loading')
    try {
      const json = extractJson(await callAI(prompt, settings, null, controller.signal))
      if (id !== requestId.current) return
      setResult(parse(json))
      setStep('review')
    } catch (e) {
      if (e.name === 'AbortError' || id !== requestId.current) return
      if (e instanceof MissingApiKeyError) setNeedsKey(true)
      else setError(e.message)
      setStep(isOptimize ? 'goal' : 'error')
    }
  }

  function runOptimize() {
    const chosen = goal === 'custom' ? customGoal.trim() : goal
    if (!chosen) {
      setError('Pick a goal first, or describe your own.')
      return
    }
    run(buildOptimizePrompt(recipe, chosen), parseOptimizeResponse)
  }

  function runNutrition() {
    run(buildNutritionPrompt(recipe), parseNutritionResponse)
  }

  // Nutrition check has no inputs — start as soon as the modal opens.
  useEffect(() => {
    if (!isOptimize) runNutrition()
    return () => { if (abortRef.current) abortRef.current.abort() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleApply() {
    if (isOptimize) {
      onApply({ ingredients: result.ingredients, stats: mergeStats(recipe.stats, result.stats) })
    } else {
      onApply({ stats: mergeStats(recipe.stats, result) })
    }
  }

  const title = isOptimize ? 'Optimize ingredients' : 'Nutrition check'
  const diff = isOptimize && step === 'review' && result
    ? diffIngredients(recipe.ingredients, result.ingredients)
    : null

  // Portal to document.body: this renders inside RecipeDetail's fixed overlay,
  // whose stacking context (z-index 150) would otherwise trap the sheet below
  // the bottom nav (also 150, later in the DOM) — hiding the footer buttons.
  return createPortal(
    <div
      className="modal-overlay modal-overlay--sheet"
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <div className="modal ai-modal modal--sheet">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        {step === 'goal' && (
          <>
            <div className="modal-body">
              <p className="import-hint">How should the ingredients change?</p>
              <div className="ai-goal-pills">
                {GOALS.map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`ai-goal-pill${goal === g ? ' selected' : ''}`}
                    onClick={() => { setGoal(g); setError('') }}
                  >
                    {g}
                  </button>
                ))}
                <button
                  type="button"
                  className={`ai-goal-pill${goal === 'custom' ? ' selected' : ''}`}
                  onClick={() => { setGoal('custom'); setError('') }}
                >
                  Something else…
                </button>
              </div>
              {goal === 'custom' && (
                <input
                  type="text"
                  className="import-url-input"
                  value={customGoal}
                  onChange={e => { setCustomGoal(e.target.value); setError('') }}
                  placeholder='e.g. "dairy-free but keep it creamy"'
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && runOptimize()}
                />
              )}
              {needsKey && (
                <div className="import-key-note">
                  {API_KEY_MSG}
                  <button
                    type="button"
                    className="btn-secondary btn-sm import-key-note-btn"
                    onClick={onOpenAISettings}
                  >
                    Open AI settings
                  </button>
                </div>
              )}
              {error && <div className="import-error">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
              <button type="button" className="btn-primary" onClick={runOptimize}>Optimize</button>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div className="modal-body">
            <div className="import-loading">
              <div className="import-spinner" />
              <div className="import-loading-msg">
                {isOptimize ? 'Optimizing ingredients…' : 'Calculating nutrition…'}
              </div>
              <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <>
            <div className="modal-body">
              {needsKey ? (
                <div className="import-key-note">
                  {API_KEY_MSG}
                  <button
                    type="button"
                    className="btn-secondary btn-sm import-key-note-btn"
                    onClick={onOpenAISettings}
                  >
                    Open AI settings
                  </button>
                </div>
              ) : (
                <div className="import-error">{error}</div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
              {!needsKey && (
                <button type="button" className="btn-primary" onClick={runNutrition}>Try again</button>
              )}
            </div>
          </>
        )}

        {step === 'review' && result && isOptimize && (
          <>
            <div className="modal-body">
              {result.summary && <p className="ai-review-summary">{result.summary}</p>}
              <div className="ai-review-section-title">Ingredients</div>
              <ul className="ai-diff-list">
                {diff.rows.map((row, i) => (
                  <li key={i} className={`ai-diff-row ai-diff--${row.change}`}>
                    <span className="ai-diff-name">{row.name}</span>
                    <span className="ai-diff-amount">
                      {row.change === 'amount'
                        ? <>{row.oldAmount || '—'} <span className="ai-diff-arrow">→</span> {row.amount}</>
                        : row.amount}
                    </span>
                    {row.change === 'added' && <span className="ai-diff-tag ai-diff-tag--added">new</span>}
                  </li>
                ))}
                {diff.removed.map((row, i) => (
                  <li key={`removed-${i}`} className="ai-diff-row ai-diff--removed">
                    <span className="ai-diff-name">{row.name}</span>
                    <span className="ai-diff-amount">{row.amount}</span>
                    <span className="ai-diff-tag ai-diff-tag--removed">removed</span>
                  </li>
                ))}
              </ul>
              {result.stats.length > 0 && (
                <>
                  <div className="ai-review-section-title">Updated nutrition (per serving)</div>
                  <StatChanges oldStats={recipe.stats} newStats={result.stats} />
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleApply}>Apply changes</button>
            </div>
          </>
        )}

        {step === 'review' && result && !isOptimize && (
          <>
            <div className="modal-body">
              <p className="import-hint">
                Estimated per serving from the ingredient amounts. Update the recipe's labels?
              </p>
              <StatChanges oldStats={recipe.stats} newStats={result} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleApply}>Update labels</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

function StatChanges({ oldStats, newStats }) {
  return (
    <ul className="ai-stat-list">
      {newStats.map((stat, i) => {
        const old = oldStats.find(o => normalizeStatLabel(o.label) === normalizeStatLabel(stat.label))
        const changed = old && String(old.value).trim() !== String(stat.value).trim()
        return (
          <li key={i} className="ai-diff-row">
            <span className="ai-diff-name">{old?.label || stat.label}</span>
            <span className="ai-diff-amount">
              {old && changed
                ? <>{old.value || '—'} <span className="ai-diff-arrow">→</span> {stat.value}</>
                : stat.value}
              {old && !changed && <span className="ai-diff-tag"> unchanged</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
