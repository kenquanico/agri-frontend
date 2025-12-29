import { useState } from 'react'
import { Plus, Trash2, Edit2, Users, Activity, X } from 'lucide-react'
 import axios from "axios";
import api from '../api/api';
import { useEffect } from "react"

export default function Fields() {
  const [fields, setFields] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showFarmerModal, setShowFarmerModal] = useState(false)
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [activeMonitoringFieldId, setActiveMonitoringFieldId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [farmerInput, setFarmerInput] = useState('')
  const [formData, setFormData] = useState({
    fieldName: '',
    area: 0.0,
    measurementUnit: '',
    crops: 0
  })

  useEffect(() => {
fetchFields()
}, [])

const fetchFields = async () => {
try {
const res = await api.get("/api/fields")
setFields(res.data)
} catch (error) {
console.error("Failed to fetch fields", error)
}
}



const handleInputChange = e => {
const { name, value, type } = e.target

setFormData(prev => ({
...prev,
[name]: type === "number" ? Number(value) : value
}))
}

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
      console.log(formData)
      const returnData =  await api.post("/api/fields", formData);
    

    setFormData({ fieldName: '', area: 0.0, measurementUnit: '', crops: 0});
    setEditingId(null);
    setShowForm(false);

  } catch (error) {
    console.error("Failed to save field:", error);
    alert(error.response?.data?.message || "Failed to save field");
  }
};


  const handleDelete = id => {
    if (activeMonitoringFieldId === id) setActiveMonitoringFieldId(null)
    setFields(fields.filter(f => f.id !== id))
  }

  const handleEdit = field => {
    setFormData(field)
    setEditingId(field.id)
    setShowForm(true)
  }

  const openFarmerModal = id => {
    setSelectedFieldId(id)
    setShowFarmerModal(true)
  }

  const handleAddFarmer = () => {
    if (!farmerInput.trim()) return
    setFields(fields.map(f =>
      f.id === selectedFieldId
        ? { ...f, farmers: [...f.farmers, farmerInput.trim()] }
        : f
    ))
    setFarmerInput('')
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setFormData({ fieldName: '', area: 0.0, measurementUnit: '', crops: 0})
    setEditingId(null)
  }

  const getSelectedField = () => fields.find(f => f.id === selectedFieldId)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        <div className="bg-white rounded-lg p-4 md:p-6 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Fields</h1>
            <p className="text-sm text-gray-600">Manage fields and farmers</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={18} />
            Add Field
          </button>
        </div>

        <div className="grid gap-4 md:hidden">
          {fields.map(field => (
            <div key={field.id} className="bg-white rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold">{field.fieldName}</h2>
                {activeMonitoringFieldId === field.id && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                    <Activity size={12} />
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">Area: {field.area}</p>
              <p className="text-sm text-gray-600">Crops: {field.crops}</p>

              <div className="flex flex-col gap-2 mt-3">
                <button
                  onClick={() => openFarmerModal(field.id)}
                  className="text-blue-600 text-sm flex items-center gap-1"
                >
                  <Users size={16} />
                  {field.farmers.length} farmers
                </button>

                <div className="flex gap-2">
                  <button onClick={() => handleEdit(field)} className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <Edit2 size={16} className="text-blue-600" />
                  </button>
                  <button onClick={() => handleDelete(field.id)} className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block bg-white rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Field</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Area</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Crops</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Farmers</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fields.map(field => (
                <tr key={field.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{field.fieldName}</td>
                  <td className="px-4 py-3">{field.area}</td>
                  <td className="px-4 py-3">{field.crops}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openFarmerModal(field.id)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      {field.farmers.length} farmers
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {activeMonitoringFieldId === field.id ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      <span className="text-gray-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(field)} className="text-blue-600 hover:text-blue-800 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(field.id)} className="text-red-600 hover:text-red-800 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {showForm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingId ? 'Edit Field' : 'Add New Field'}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4">
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field Name
                    </label>
                    <input
                      name="fieldName"
                      placeholder="Enter field name"
                      value={formData.fieldName}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Area
                      </label>
                      <div className="flex space-x-2">
                        <input
                        type='number'
                          name="area"
                          placeholder="Enter area"
                          value={formData.area}
                          onChange={handleInputChange}
                          required
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <select
                          name="measurementUnit"
                          value={formData.measurementUnit}
                          onChange={handleInputChange}
                          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="sqm">sqm</option>
                          <option value="hectare">hectare</option>
                          <option value="acre">acre</option>
                        </select>
                      </div>
                    </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Crops
                    </label>
                    <input
                    type='number'
                      name="crops"
                      placeholder="Enter crops (e.g., Wheat, Corn)"
                      value={formData.crops}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    {editingId ? 'Update Field' : 'Add Field'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {showFarmerModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  Farmers for {getSelectedField()?.fieldName}
                </h2>
                <button
                  onClick={() => setShowFarmerModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                <div className="flex gap-2 mb-4">
                  <input
                    value={farmerInput}
                    onChange={e => setFarmerInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleAddFarmer()}
                    className="border border-gray-300 rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter farmer name"
                  />
                  <button
                    onClick={handleAddFarmer}
                    className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Add
                  </button>
                </div>

                <div className="grid gap-2">
                  {getSelectedField()?.farmers.length > 0 ? (
                    getSelectedField()?.farmers.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-700">{f}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 text-sm py-4">No farmers added yet</p>
                  )}
                </div>
              </div>

              <div className="p-4 border-t">
                <button
                  onClick={() => setShowFarmerModal(false)}
                  className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}