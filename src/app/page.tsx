'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDownIcon, ChevronUpIcon, ArrowUpDownIcon, ExternalLinkIcon, AlertCircleIcon } from 'lucide-react'

// Types
interface Ranking {
  pain: number
  market: number
  buildability: number
  moat: number
  revenue: number
  virality: number
  weighted_score: number
}

interface DeveloperOutput {
  build_status: string
  files_implemented: string[]
  build_errors: string[]
}

interface QACoverage {
  pages_found: number
  pages_expected: number
  endpoints_found: number
  endpoints_expected: number
  components_found: number
  components_expected: number
}

interface QAOutput {
  verdict: 'pass' | 'fail'
  build_ok: boolean
  lint_ok: boolean
  issues: string[]
  coverage: QACoverage
}

interface Idea {
  id: number
  name: string
  status: 'proposed' | 'active' | 'specced' | 'designed' | 'building' | 'built' | 'developed' | 'qa_pass' | 'qa_fail' | 'deployed' | 'killed' | 'filtered'
  one_liner: string
  ranking: Ranking
  repo_url: string
  live_url: string
  developer_output: DeveloperOutput
  qa_output: QAOutput
}

interface PipelineData {
  next_id?: number
  nextId?: number
  ideas: Idea[]
}

type SortField = 'id' | 'name' | 'status' | 'weighted_score'
type SortDirection = 'asc' | 'desc'

const STATUS_COLORS = {
  proposed: 'bg-teal-100 text-teal-800',
  active: 'bg-blue-100 text-blue-800',
  specced: 'bg-indigo-100 text-indigo-800',
  designed: 'bg-purple-100 text-purple-800',
  building: 'bg-amber-100 text-amber-800',
  built: 'bg-yellow-100 text-yellow-800',
  developed: 'bg-lime-100 text-lime-800',
  qa_pass: 'bg-green-100 text-green-800',
  qa_fail: 'bg-red-100 text-red-800',
  deployed: 'bg-emerald-100 text-emerald-800',
  killed: 'bg-gray-100 text-gray-800',
  filtered: 'bg-slate-100 text-slate-800',
}

const getScoreColor = (score: number) => {
  if (score > 7) return 'text-green-600'
  if (score >= 4) return 'text-yellow-600'
  return 'text-red-600'
}

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>
    {status}
  </span>
)

const StatCard = ({ label, count, status }: { label: string; count: number; status: string }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 font-mono">{count}</p>
      </div>
      <StatusBadge status={status} />
    </div>
  </div>
)

const RankingBar = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center space-x-2">
    <span className="text-xs text-gray-600 w-16">{label}</span>
    <div className="flex-1 bg-gray-200 rounded-full h-2">
      <div 
        className="bg-blue-500 h-2 rounded-full" 
        style={{ width: `${value * 10}%` }}
      />
    </div>
    <span className="text-xs font-mono text-gray-900 w-6">{value}</span>
  </div>
)

export default function Dashboard() {
  const [data, setData] = useState<PipelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('https://eitan-openclaw.duckdns.org/api/pipeline', {
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      setData(result)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [fetchData])

  const toggleRowExpansion = (id: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedIdeas = data?.ideas.slice().sort((a, b) => {
    let aVal, bVal
    
    switch (sortField) {
      case 'id':
        aVal = a.id
        bVal = b.id
        break
      case 'name':
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        break
      case 'status':
        aVal = a.status
        bVal = b.status
        break
      case 'weighted_score':
        aVal = a.ranking.weighted_score
        bVal = b.ranking.weighted_score
        break
      default:
        return 0
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  }) || []

  const statusCounts = data?.ideas.reduce((acc, idea) => {
    acc[idea.status] = (acc[idea.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button 
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 text-left font-medium text-gray-900 hover:text-gray-700"
    >
      <span>{children}</span>
      {sortField === field ? (
        sortDirection === 'asc' ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />
      ) : (
        <ArrowUpDownIcon className="w-4 h-4 opacity-50" />
      )}
    </button>
  )

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading pipeline data...</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const allStatuses = ['proposed', 'active', 'specced', 'designed', 'building', 'built', 'developed', 'qa_pass', 'qa_fail', 'deployed', 'killed', 'filtered']

  return (
    <div className="space-y-6">
      {/* Status indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="text-sm text-gray-600">
            {error ? `Error: ${error}` : 'Connected'}
          </span>
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 font-mono">
          Next ID: {data?.next_id ?? data?.nextId ?? 'N/A'}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-4">
        {allStatuses.map(status => (
          <StatCard 
            key={status}
            label={status.replace('_', ' ')}
            count={statusCounts[status] || 0}
            status={status}
          />
        ))}
      </div>

      {/* Ideas Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="id">ID</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="name">Name</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="status">Status</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="weighted_score">Score</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Links
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedIdeas.map((idea) => (
                <>
                  <tr key={idea.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {idea.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {idea.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <StatusBadge status={idea.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                      <span className={`font-semibold ${getScoreColor(idea.ranking.weighted_score)}`}>
                        {idea.ranking.weighted_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {idea.repo_url && (
                          <a 
                            href={idea.repo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLinkIcon className="w-4 h-4" />
                          </a>
                        )}
                        {idea.live_url && (
                          <a 
                            href={idea.live_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800"
                          >
                            <ExternalLinkIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => toggleRowExpansion(idea.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {expandedRows.has(idea.id) ? (
                          <ChevronUpIcon className="w-4 h-4" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(idea.id) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-4">
                          {/* One-liner */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                            <p className="text-sm text-gray-700">{idea.one_liner}</p>
                          </div>

                          {/* Ranking Bars */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Ranking Breakdown</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <RankingBar label="Pain" value={idea.ranking.pain} />
                              <RankingBar label="Market" value={idea.ranking.market} />
                              <RankingBar label="Build" value={idea.ranking.buildability} />
                              <RankingBar label="Moat" value={idea.ranking.moat} />
                              <RankingBar label="Revenue" value={idea.ranking.revenue} />
                              <RankingBar label="Viral" value={idea.ranking.virality} />
                            </div>
                          </div>

                          {/* Build Status */}
                          {idea.developer_output && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Build Status</h4>
                              <p className="text-sm text-gray-700 mb-2">Status: {idea.developer_output.build_status}</p>
                              <p className="text-sm text-gray-700 mb-2">
                                Files: <span className="font-mono">{idea.developer_output.files_implemented?.length || 0}</span>
                              </p>
                              {idea.developer_output.build_errors?.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-red-600 mb-1">Build Errors:</p>
                                  <ul className="text-sm text-red-700 space-y-1">
                                    {idea.developer_output.build_errors.map((error, idx) => (
                                      <li key={idx} className="font-mono text-xs bg-red-50 p-2 rounded">
                                        {error}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {/* QA Status */}
                          {idea.qa_output && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">QA Status</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-gray-700">
                                    Verdict: <span className={`font-semibold ${idea.qa_output.verdict === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                                      {idea.qa_output.verdict}
                                    </span>
                                  </p>
                                  <p className="text-sm text-gray-700">
                                    Build OK: <span className={idea.qa_output.build_ok ? 'text-green-600' : 'text-red-600'}>
                                      {idea.qa_output.build_ok ? 'Yes' : 'No'}
                                    </span>
                                  </p>
                                  <p className="text-sm text-gray-700">
                                    Lint OK: <span className={idea.qa_output.lint_ok ? 'text-green-600' : 'text-red-600'}>
                                      {idea.qa_output.lint_ok ? 'Yes' : 'No'}
                                    </span>
                                  </p>
                                </div>
                                {idea.qa_output.coverage && (
                                  <div className="text-sm text-gray-700 font-mono">
                                    <p>Pages: {idea.qa_output.coverage.pages_found}/{idea.qa_output.coverage.pages_expected}</p>
                                    <p>Endpoints: {idea.qa_output.coverage.endpoints_found}/{idea.qa_output.coverage.endpoints_expected}</p>
                                    <p>Components: {idea.qa_output.coverage.components_found}/{idea.qa_output.coverage.components_expected}</p>
                                  </div>
                                )}
                              </div>
                              {idea.qa_output.issues?.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-sm font-medium text-red-600 mb-1">Issues:</p>
                                  <ul className="text-sm text-red-700 space-y-1">
                                    {idea.qa_output.issues.map((issue, idx) => (
                                      <li key={idx} className="bg-red-50 p-2 rounded">
                                        {issue}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sortedIdeas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No ideas in the pipeline yet.</p>
        </div>
      )}
    </div>
  )
}